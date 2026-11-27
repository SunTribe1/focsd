import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, test } from './fixtures/test.js';

const markup = execFileSync(process.execPath, [fileURLToPath(new URL('./fixtures/ssr-render-wide.mjs', import.meta.url))], {
  encoding: 'utf8',
});

/** Lit logs hydration trouble as console warnings and errors; any of these fail the test. */
const HYDRATION = /hydration|hydrate|mismatch|template/i;

/**
 * Load `html` as server markup, let the components hydrate, and report what went wrong: console and
 * page errors, and the server-made shadow nodes that hydration did not keep (a re-render replaces them).
 * @param {import('@playwright/test').Page} page
 * @param {string} html
 */
async function hydrate(page, html) {
  const problems = [];

  await page.addInitScript((value) => {
    window.__ssr = value;
  }, html);
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (['warning', 'error'].includes(message.type()) && HYDRATION.test(message.text()))
      problems.push(`${message.type()}: ${message.text()}`);
  });
  await page.goto('/ssr.html');
  await page.waitForFunction(() => window.__ssrReady);
  await page.waitForFunction(() =>
    [...document.querySelectorAll('#ssr-root > *')].every((el) => el.shadowRoot && customElements.get(el.localName)),
  );
  await page.evaluate(() => Promise.allSettled([...document.querySelectorAll('#ssr-root > *')].map((el) => el.updateComplete)));

  const replaced = await page.evaluate(() =>
    [...document.querySelectorAll('#ssr-root > *')].flatMap((el, i) => {
      const node = window.__ssrNodes[i];

      return node && node.isConnected && node.getRootNode().host === el ? [] : [el.id || el.localName];
    }),
  );

  return { problems, replaced };
}

test('twelve server-rendered elements hydrate without warnings, keep their server nodes and stay interactive', async ({ page }) => {
  const { problems, replaced } = await hydrate(page, markup);

  expect(await page.evaluate(() => window.__ssrShadowBeforeUpgrade)).toBe(true);
  expect(await page.evaluate(() => document.querySelectorAll('#ssr-root > *').length)).toBe(12);
  // Every element had a server-made node and hydration kept it (I9: a re-render would replace it).
  expect(await page.evaluate(() => window.__ssrNodes.every(Boolean))).toBe(true);
  expect(replaced).toEqual([]);

  await page.locator('#h-button').click();
  await page.getByRole('textbox', { name: 'Project name' }).fill('Changed');
  await expect.poll(() => page.locator('#h-text').evaluate((el) => el.value)).toBe('Changed');
  await page.getByRole('textbox', { name: 'Notes' }).fill('Edited');
  await expect.poll(() => page.locator('#h-area').evaluate((el) => el.value)).toBe('Edited');
  await page.getByRole('checkbox', { name: 'Email me updates' }).click();
  await expect(page.getByRole('checkbox', { name: 'Email me updates' })).not.toBeChecked();
  await page.getByRole('switch', { name: 'Dark mode' }).click();
  await expect(page.getByRole('switch', { name: 'Dark mode' })).toBeChecked();
  await page.getByRole('radio', { name: 'Pro' }).click();
  await expect.poll(() => page.locator('#h-radios').evaluate((el) => el.value)).toBe('pro');
  await page.locator('#h-select').getByRole('button').click();
  await page.getByRole('option', { name: 'United States' }).click();
  await expect.poll(() => page.locator('#h-select').evaluate((el) => el.value)).toBe('us');
  await page.getByRole('tab', { name: 'Two' }).click();
  await expect(page.getByText('Second panel')).toBeVisible();
  await page.getByRole('button', { name: 'Shipping' }).click();
  await expect(page.getByText('Ships in two days.')).toBeVisible();
  await page.getByRole('button', { name: 'More detail' }).click();
  await expect(page.getByText('Hidden detail.')).toBeVisible();
  await page.getByRole('button', { name: 'Bold' }).click();
  await expect.poll(() => page.locator('#h-toggle').evaluate((el) => el.pressed)).toBe(true);
  await page.getByRole('spinbutton', { name: 'Quantity' }).press('ArrowUp');
  await expect.poll(() => page.locator('#h-number').evaluate((el) => String(el.value))).toBe('3');

  expect(problems).toEqual([]);
});

test('the negative twin: corrupted server markup is caught (I9)', async ({ page }) => {
  // Change the template digest of the button's shadow content, as if the server rendered another template.
  const at = markup.indexOf('<!--lit-part ', markup.indexOf('id="h-button"'));
  const end = markup.indexOf('-->', at);
  const corrupted = `${markup.slice(0, at)}<!--lit-part AAAAAAAAAAA=${markup.slice(end)}`;

  expect(at).toBeGreaterThan(0);
  const { problems, replaced } = await hydrate(page, corrupted);

  // Lit reports "Hydration value mismatch" as a page error; a re-render would show in `replaced`.
  expect([...problems, ...replaced].length).toBeGreaterThan(0);
});
