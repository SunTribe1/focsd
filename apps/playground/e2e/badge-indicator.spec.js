import { expect, test } from './fixtures/test.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/badge-indicator.html');
  await page.waitForFunction(() => customElements.get('focsd-badge'));
});

/** @param {import('@playwright/test').Locator} locator */
const center = async (locator) => {
  const box = /** @type {{ x: number, y: number, width: number, height: number }} */ (await locator.boundingBox());

  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

test('the count joins the name of the control around it', async ({ page }) => {
  // Exact names: the hidden text is set off by a space on each side, before or after the label.
  await expect(page.getByRole('link', { name: /Inbox/ })).toHaveAccessibleName('Inbox 3 unread');
  await expect(page.getByRole('button', { name: /Messages/ })).toHaveAccessibleName('120 unread Messages');
  // Chromium separates them anyway; the spaces are for engines that do not (R32).
  expect(await page.locator('#b1 [part~="hidden-text"]').evaluate((el) => el.textContent)).toBe(' 3 unread ');
});

test('the visible count is capped at max; the indicator itself is hidden from AT', async ({ page }) => {
  await expect(page.locator('#b2 [part~="indicator"]')).toHaveText('99+');
  await expect(page.locator('#b2 [part~="indicator"]')).toHaveAttribute('aria-hidden', 'true');
  await page.locator('#b2').evaluate((el) => el.setAttribute('max', '200'));
  await expect(page.locator('#b2 [part~="indicator"]')).toHaveText('120');
});

test('a dot uses its label; a dot without label warns once', async ({ page }) => {
  await expect(page.locator('#b3 [part~="hidden-text"]')).toHaveText('Online');
  await expect(page.locator('#b3 [part~="indicator"]')).toHaveText('');
  expect(await page.evaluate(() => window.__warn.filter((w) => w.startsWith('Focsd: A <focsd-badge> dot needs a label')).length)).toBe(1);
});

test('a count of 0 shows the anchor only and announces nothing', async ({ page }) => {
  await expect(page.locator('#b5 [part~="anchor"]')).toHaveCount(1);
  await expect(page.locator('#b5 [part~="indicator"]')).toHaveCount(0);
  await expect(page.locator('#b5 [part~="hidden-text"]')).toHaveCount(0);
  await page.locator('#b5').evaluate((el) => el.setAttribute('count', '4'));
  await expect(page.locator('#b5 [part~="indicator"]')).toHaveText('4');
  await expect(page.locator('#b5 [part~="hidden-text"]')).toHaveText('4 unread');
});

test('placement top-end follows the reading direction', async ({ page }) => {
  const a = await center(page.locator('#b3 [part~="anchor"]'));
  let d = await center(page.locator('#b3 [part~="indicator"]'));

  expect(d.x).toBeGreaterThan(a.x);
  expect(d.y).toBeLessThan(a.y);
  await page.locator('#b3').evaluate((el) => el.setAttribute('dir', 'rtl'));
  d = await center(page.locator('#b3 [part~="indicator"]'));
  expect(d.x).toBeLessThan(a.x);
});

test('placement bottom-start puts the indicator at the bottom inline-start corner', async ({ page }) => {
  await page.locator('#b3').evaluate((el) => el.setAttribute('placement', 'bottom-start'));
  const a = await center(page.locator('#b3 [part~="anchor"]'));
  const d = await center(page.locator('#b3 [part~="indicator"]'));

  expect(d.x).toBeLessThan(a.x);
  expect(d.y).toBeGreaterThan(a.y);
});

test('a badge without dot or count is the plain inline badge', async ({ page }) => {
  // The text is slotted, so it is the host's text, not the part's.
  await expect(page.locator('#plain')).toHaveText('Active');
  await expect(page.locator('#plain [part~="badge"]')).toHaveCount(1);
  await expect(page.locator('#plain [part~="anchor"]')).toHaveCount(0);
  await expect(page.locator('#plain [part~="indicator"]')).toHaveCount(0);
});

test('the dot and the count stay visible in forced colors', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'forced-colors emulation is Chromium-only');
  await page.emulateMedia({ forcedColors: 'active' });

  for (const id of ['#b2', '#b3']) {
    const style = await page
      .locator(`${id} [part~="indicator"]`)
      .evaluate((el) => ({ width: getComputedStyle(el).borderTopWidth, color: getComputedStyle(el).borderTopColor }));

    expect(Number.parseFloat(style.width)).toBeGreaterThanOrEqual(1);
    expect(style.color).not.toBe('rgba(0, 0, 0, 0)');
  }
});

for (const theme of THEMES)
  test(`axe-clean in the ${theme} theme`, async ({ page }) => {
    await gotoInTheme(page, '/badge-indicator.html', theme, 'focsd-badge');
    await expectAxeClean(page);
  });
