import { expect, test } from './fixtures/test.js';

// Phone-sized, touch, mobile viewport (Pixel 7 metrics). Firefox has no isMobile emulation.
test.use({ hasTouch: true, isMobile: true, viewport: { width: 412, height: 915 }, reducedMotion: 'reduce' });

test.beforeEach(async ({ page, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox does not support isMobile');
  await page.goto('/mobile.html');
  await page.waitForFunction(() => customElements.get('focsd-select') && customElements.get('focsd-menu'));
});

/** The on-screen keyboard shrinks the visual viewport (not the layout viewport): emulate that. */
const openKeyboard = (page, height) =>
  page.evaluate((h) => {
    Object.defineProperty(window.visualViewport, 'height', { configurable: true, get: () => h });
    window.visualViewport.dispatchEvent(new Event('resize'));
  }, height);

const height = (locator) => locator.evaluate((el) => el.getBoundingClientRect().height);
const rootVar = (page) => page.evaluate(() => document.documentElement.style.getPropertyValue('--_focsd-visual-viewport-height'));

test('select list fits in half the visual viewport when the keyboard is open', async ({ page }) => {
  await page.locator('#m-select').getByRole('button').tap();
  // The popup (filter box, select all, listbox) is what is capped and scrolls.
  await expect(page.locator('#m-select').getByRole('listbox')).toBeVisible();
  const list = page.locator("#m-select [part~='popup']");
  await openKeyboard(page, 300);
  await expect.poll(() => height(list)).toBeLessThanOrEqual(151);
});

test('combobox list stays above the keyboard while typing', async ({ page }) => {
  const input = page.locator('#m-combo').getByRole('combobox');
  await input.tap();
  await input.fill('City');
  await expect(page.locator('#m-combo').getByRole('listbox')).toBeVisible();
  const list = page.locator("#m-combo [part~='popup']");
  await openKeyboard(page, 320);
  await expect.poll(() => height(list)).toBeLessThanOrEqual(161);
});

test('menu fits in half the visual viewport', async ({ page }) => {
  await page.locator('#m-menu').getByRole('button', { name: 'Actions' }).tap();
  const menu = page.locator('#m-menu').getByRole('menu');
  await expect(menu).toBeVisible();
  await openKeyboard(page, 280);
  await expect.poll(() => height(menu)).toBeLessThanOrEqual(141);
});

test('stops tracking the viewport once the popup closes', async ({ page }) => {
  await page.locator('#m-select').getByRole('button').tap();
  await expect(page.locator('#m-select').getByRole('listbox')).toBeVisible();
  await expect.poll(() => rootVar(page)).toMatch(/px$/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#m-select').getByRole('listbox')).toBeHidden();
  await expect.poll(() => rootVar(page)).toBe('');
});

test('a list opened inside a scroll container stays attached when the container scrolls', async ({ page }) => {
  const trigger = page.locator('#m-nested').getByRole('button');
  await trigger.tap();
  const list = page.locator('#m-nested').getByRole('listbox');
  await expect(list).toBeVisible();

  const gap = async () =>
    Math.round(
      (await list.evaluate((el) => el.getBoundingClientRect().top)) - (await trigger.evaluate((el) => el.getBoundingClientRect().bottom)),
    );

  // Anchored layout settles a frame after opening.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const before = await gap();
  await page.locator('#m-scroller').evaluate((el) => (el.scrollTop = 24));
  await expect.poll(gap).toBe(before);
});

test('scrolling a list to its end does not scroll the page behind it', async ({ page }) => {
  for (const id of ['#m-select', '#m-combo']) {
    expect(await page.locator(`${id} [part~='popup']`).evaluate((el) => getComputedStyle(el).overscrollBehaviorBlock)).toBe('contain');
  }

  await page.locator('#m-menu').getByRole('button', { name: 'Actions' }).tap();
  expect(
    await page
      .locator('#m-menu')
      .getByRole('menu')
      .evaluate((el) => getComputedStyle(el).overscrollBehaviorBlock),
  ).toBe('contain');
});

test('a popover panel stays within the visible screen and scrolls inside', async ({ page }) => {
  await page.locator('#m-pop').getByRole('button', { name: 'Filters' }).tap();
  const panel = page.locator("#m-pop [part~='panel']");
  await expect(panel).toBeVisible();
  await openKeyboard(page, 300);
  await expect.poll(() => height(panel)).toBeLessThanOrEqual(300);
  expect(await panel.evaluate((el) => getComputedStyle(el).overflowY)).toBe('auto');
});
