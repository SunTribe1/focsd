import { expect, test } from './fixtures/test.js';
import { mountInMain as mount, openFromMinorsPolish } from './fixtures/pages.js';
import { expectAnnounced, recordAnnouncements } from './fixtures/announcements.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';

/** mode: 'ok' records writes, 'deny' rejects, 'none' removes the Clipboard API. */
const stubClipboard = (page, mode) =>
  page.addInitScript((m) => {
    window.__copied = [];

    if (m === 'none') Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    else
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: (t) =>
            m === 'deny' ? Promise.reject(new DOMException('Denied', 'NotAllowedError')) : (window.__copied.push(t), Promise.resolve()),
        },
      });
    document.execCommand = (cmd) => cmd === 'copy' && window.__copied.push('exec') > 0;
  }, mode);

const open = async (page) => {
  await recordAnnouncements(page);
  await page.clock.install();
  await page.goto('/copy-button.html');
  await page.waitForFunction(() => customElements.get('focsd-copy-button'));
};

test('copies the value, shows a check for 2 seconds and announces "Copied"', async ({ page }) => {
  await stubClipboard(page, 'ok');
  await open(page);
  const button = page.getByRole('button', { name: 'Copy', exact: true });
  await button.click();
  expect(await page.evaluate(() => window.__copied)).toEqual(['https://focsd.dev/install']);
  await expectAnnounced(page, 'Copied');
  await expect(page.locator('#c2 [part~="icon"]')).toHaveAttribute('data-icon', 'check');
  await page.clock.runFor(2100);
  await expect(page.locator('#c2 [part~="icon"]')).toHaveAttribute('data-icon', 'copy');
  await expect(button).toHaveAccessibleName('Copy');
});

test('from copies an element’s text, or a form control’s value', async ({ page }) => {
  await stubClipboard(page, 'ok');
  await open(page);
  await page.getByRole('button', { name: 'Copy API key' }).click();
  await page.getByRole('button', { name: 'Copy share link' }).click();
  expect(await page.evaluate(() => window.__copied)).toEqual(['sk_live_51H8', 'https://focsd.dev/s/42']);
});

test('a refused write announces "Could not copy" and fires focsd-error, never "Copied"', async ({ page }) => {
  await stubClipboard(page, 'deny');
  await open(page);
  await page.getByRole('button', { name: 'Copy', exact: true }).click();
  await expectAnnounced(page, 'Could not copy');
  await expect(page.locator('#c2 [part~="icon"]')).toHaveAttribute('data-icon', 'alert-circle');
  expect(await page.evaluate(() => window.__ev)).toEqual([{ type: 'focsd-error', id: 'c2' }]);
  expect((await page.evaluate(() => window.__focsdAnnouncements)).some((a) => a.text === 'Copied')).toBe(false);
});

test('without the Clipboard API it falls back to execCommand', async ({ page }) => {
  await stubClipboard(page, 'none');
  await open(page);
  await page.getByRole('button', { name: 'Copy', exact: true }).click();
  expect(await page.evaluate(() => window.__copied)).toEqual(['exec']);
  await expectAnnounced(page, 'Copied');
});

test('the code block uses the copy button and keeps its name', async ({ page }) => {
  await stubClipboard(page, 'ok');
  await open(page);
  await expect(page.locator('#code focsd-copy-button')).toHaveCount(1);
  await page.locator('#code').getByRole('button', { name: 'Copy code' }).click();
  expect(await page.evaluate(() => window.__copied)).toEqual(['pnpm add @focsd-dev/components']);
});

test('the code block copies its current text after the text changes', async ({ page }) => {
  await stubClipboard(page, 'ok');
  await open(page);
  await page.locator('#code').evaluate((el) => (el.textContent = 'pnpm add lit'));
  expect(await page.locator('#code focsd-copy-button').evaluate((el) => el.copy())).toBe(true);
  expect(await page.evaluate(() => window.__copied)).toEqual(['pnpm add lit']);
});

test.describe('real clipboard (Chromium grants clipboard permissions; Firefox and WebKit cannot in Playwright)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium');

  test('the text reaches the system clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page);
    await page.getByRole('button', { name: 'Copy API key' }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('sk_live_51H8');
  });
});

for (const theme of THEMES)
  test(`axe-clean in the ${theme} theme`, async ({ page }) => {
    await gotoInTheme(page, '/copy-button.html', theme, 'focsd-copy-button');
    await expectAxeClean(page);
  });

test('moved within the 2 seconds, it comes back on the copy icon with an empty status', async ({ page }) => {
  await stubClipboard(page, 'ok');
  await open(page);
  await page.getByRole('button', { name: 'Copy', exact: true }).click();
  await expect(page.locator('#c2 [part~="icon"]')).toHaveAttribute('data-icon', 'check');
  await page.evaluate(() => document.querySelector('main').append(document.getElementById('c2')));
  await expect(page.locator('#c2 [part~="icon"]')).toHaveAttribute('data-icon', 'copy');
  await expect(page.locator('#c2 [part~="status"]')).toHaveText('');
});

test('the execCommand fallback keeps keyboard focus on the button', async ({ page }) => {
  await stubClipboard(page, 'none');
  await open(page);
  const button = page.getByRole('button', { name: 'Copy', exact: true });
  await button.focus();
  await page.keyboard.press('Enter');
  await expectAnnounced(page, 'Copied');
  await expect(button).toBeFocused();
});

test('nothing to copy (from names no element) fails: "Could not copy" and focsd-error, no write', async ({ page }) => {
  await stubClipboard(page, 'ok');
  await open(page);
  await page.evaluate(() => {
    const button = Object.assign(document.createElement('focsd-copy-button'), { id: 'c4', from: 'nope', label: 'Copy nothing' });
    document.querySelector('main').append(button);
    button.addEventListener('focsd-error', () => window.__ev.push({ type: 'focsd-error', id: 'c4' }));
  });
  await page.getByRole('button', { name: 'Copy nothing' }).click();
  await expectAnnounced(page, 'Could not copy');
  await expect(page.locator('#c4 [part~="icon"]')).toHaveAttribute('data-icon', 'alert-circle');
  expect(await page.evaluate(() => window.__copied)).toEqual([]);
  expect(await page.evaluate(() => window.__ev)).toEqual([{ type: 'focsd-error', id: 'c4' }]);
});

// Re-homed from minors-polish.spec.js (Q48).

test('a failed copy says so in the error tone and selects the code for copying by hand', async ({ page }) => {
  await openFromMinorsPolish(page);
  await mount(page, '<focsd-code id="cd" label="Install">npm i focsd</focsd-code>');
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('denied')) } });
    document.execCommand = () => false;
  });
  await page.locator('#cd').getByRole('button', { name: /copy/i }).click();
  const status = page.locator('#cd').getByRole('status');
  await expect(status).not.toBeEmpty();
  await expect(status).toHaveAttribute('data-tone', 'critical');
  await expect(page.locator('#cd').getByRole('region')).toBeFocused();
  expect(await page.evaluate(() => window.getSelection().toString())).toContain('npm i focsd');
});
