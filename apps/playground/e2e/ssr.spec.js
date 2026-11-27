import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, test } from './fixtures/test.js';

const markup = execFileSync(process.execPath, [fileURLToPath(new URL('./fixtures/ssr-render.mjs', import.meta.url))], { encoding: 'utf8' });

test.beforeEach(async ({ page }) => {
  await page.addInitScript((html) => {
    window.__ssr = html;
  }, markup);
});

test('server output carries declarative shadow roots', () => {
  expect(markup).toMatch(/<template shadowroot(mode)?="open"/);
  expect(markup).toContain('Project name');
});

test('server-rendered components show before upgrade and hydrate without errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/ssr.html');
  await page.waitForFunction(() => window.__ssrReady);
  expect(await page.evaluate(() => window.__ssrShadowBeforeUpgrade)).toBe(true);

  await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Project name' })).toHaveValue('Focsd');
  await expect(page.getByRole('checkbox', { name: 'Email me updates' })).toBeChecked();

  // Interactive after hydration.
  await page.getByRole('checkbox', { name: 'Email me updates' }).click();
  await expect(page.getByRole('checkbox', { name: 'Email me updates' })).not.toBeChecked();
  await page.getByRole('tab', { name: 'Two' }).click();
  await expect(page.getByText('Second panel')).toBeVisible();
  await page.locator('#s-select').getByRole('button').click();
  await page.getByRole('option', { name: 'United States' }).click();
  await expect.poll(() => page.locator('#s-select').evaluate((el) => el.value)).toBe('us');
  expect(errors).toEqual([]);
});
