import { expect, test } from './fixtures/test.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';
import { pressTab } from './fixtures/keys.js';

test.use({ contextOptions: { reducedMotion: 'reduce' }, viewport: { width: 1280, height: 800 } });

test.beforeEach(async ({ page }) => {
  await page.goto('/app-shell.html');
  await page.waitForFunction(() => customElements.get('focsd-app-shell'));
});

/**
 * The bounding box of one of the shell's own parts. A piercing `[part~="header"]` locator would
 * also match the `<header part="header">` inside the slotted focsd-header, so ask the shadow root.
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
const shellPart = (page, name) =>
  page.locator('#shell').evaluate((shell, part) => {
    const { x, y, width, height } = shell.shadowRoot.querySelector(`[part~="${part}"]`).getBoundingClientRect();

    return { x, y, width, height };
  }, name);

test('one main, one banner, one contentinfo, a navigation', async ({ page }) => {
  await expect(page.getByRole('main')).toHaveCount(1);
  await expect(page.getByRole('banner')).toHaveCount(1);
  await expect(page.getByRole('contentinfo')).toHaveCount(1);
  await expect(page.getByRole('navigation', { name: 'Workspace' })).toBeVisible();
});

test('the first Tab stop is a skip link that focuses main', async ({ page }) => {
  await pressTab(page);
  const skip = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
});

test('a focsd-skip-link with the default href reaches the shell main in its shadow root (B14)', async ({ page }) => {
  await page.evaluate(() => {
    const link = document.createElement('focsd-skip-link');
    link.textContent = 'Skip to content';
    document.body.prepend(link);
  });
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await skip.focus();
  await skip.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
});

test('desktop grid: header on top, sidebar beside main; main scrolls, header stays', async ({ page }) => {
  const header = await shellPart(page, 'header');
  const side = await shellPart(page, 'sidebar');
  const main = await page.getByRole('main').boundingBox();
  expect(side.y).toBeGreaterThanOrEqual(header.y + header.height - 1);
  expect(side.x + side.width).toBeLessThanOrEqual(main.x + 1);
  await page.getByRole('main').evaluate((m) => m.scrollTo(0, m.scrollHeight));
  await expect(page.locator('#end')).toBeInViewport();
  expect((await shellPart(page, 'header')).y).toBe(header.y);
});

test('below collapse-below the sidebar moves into a drawer', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 800 });
  const toggle = page.getByRole('button', { name: 'Open navigation' });
  await expect(toggle).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Workspace' })).toBeHidden();
  await toggle.click();
  const drawer = page.getByRole('dialog', { name: 'Workspace' });
  // Slotted links are not DOM descendants of the shadow dialog, so a locator chained on the dialog
  // misses them: check the link is shown and that the sidebar is assigned to the drawer's slot.
  await expect(drawer).toBeVisible();
  await expect(page.getByRole('link', { name: 'Projects' })).toBeVisible();
  expect(await page.locator('focsd-sidebar').evaluate((s) => s.assignedSlot?.closest('dialog')?.getAttribute('part'))).toBe('drawer');
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(toggle).toBeFocused();
});

test('the drawer close button and a followed link both close the drawer', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 800 });
  const toggle = page.getByRole('button', { name: 'Open navigation' });
  const drawer = page.getByRole('dialog', { name: 'Workspace' });
  await toggle.click();
  await drawer.getByRole('button', { name: 'Close navigation' }).click();
  await expect(drawer).toBeHidden();
  await expect(toggle).toBeFocused();
  await toggle.click();
  // The link is slotted (light DOM), so scope by page rather than by the dialog's DOM subtree.
  await page.getByRole('link', { name: 'Reports' }).click();
  await expect(drawer).toBeHidden();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByRole('navigation', { name: 'Workspace' })).toBeVisible();
  await expect(toggle).toHaveCount(0);
});

test('widening past collapse-below with the drawer open keeps focus in the shell', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 800 });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('button', { name: 'Close navigation' })).toBeFocused();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // The close button is gone with the drawer; focus moves to main, not to the body.
  await expect(page.getByRole('main')).toBeFocused();
});

test('changing collapse-below at runtime switches the layout without a resize', async ({ page }) => {
  const shell = page.locator('#shell');
  const toggle = page.getByRole('button', { name: 'Open navigation' });
  await shell.evaluate((s) => s.setAttribute('collapse-below', '2000'));
  await expect(toggle).toBeVisible();
  await expect(shell).toHaveAttribute('compact', '');
  await shell.evaluate((s) => s.setAttribute('collapse-below', '600'));
  await expect(toggle).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Workspace' })).toBeVisible();
});

for (const density of ['default', 'compact'])
  test(`the menu and close buttons meet the target size in the ${density} density`, async ({ page }) => {
    await page.locator('html').evaluate((h, d) => h.setAttribute('data-focsd-density', d), density);
    await page.setViewportSize({ width: 600, height: 800 });
    const min = await page.locator('#shell').evaluate((s) => Number.parseFloat(getComputedStyle(s).getPropertyValue('--focsd-target-min')));
    expect(min).toBeGreaterThanOrEqual(24);
    const toggle = page.getByRole('button', { name: 'Open navigation' });
    await toggle.click();

    for (const button of [toggle, page.getByRole('button', { name: 'Close navigation' })]) {
      const box = await button.boundingBox();
      expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(min);
    }

    // Pin the minimum itself, not only today's control height.
    const declared = await page
      .locator('#shell')
      .evaluate((s) =>
        ['nav-toggle', 'drawer-close'].map((p) => getComputedStyle(s.shadowRoot.querySelector(`[part~="${p}"]`)).minBlockSize),
      );

    expect(declared).toEqual([`${min}px`, `${min}px`]);
  });

test('forced colors: focused main shows a real outline', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  const main = page.getByRole('main');
  await expect(main).toBeFocused();
  await expect(main).toHaveCSS('outline-style', 'solid');
  await expect(main).toHaveCSS('outline-width', '2px');
});

test('a <main> slotted into the shell later still warns once', async ({ page }) => {
  const warnings = [];
  page.on('console', (m) => m.type() === 'warning' && m.text().includes('focsd-app-shell') && warnings.push(m.text()));
  await page.locator('#shell').evaluate(async (s) => {
    s.append(document.createElement('main'), document.createElement('main'));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
  await expect.poll(() => warnings.length).toBe(1);
});

test('without nav-label the drawer is named "Navigation"', async ({ page }) => {
  await page.locator('#shell').evaluate((s) => s.removeAttribute('nav-label'));
  await page.setViewportSize({ width: 600, height: 800 });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('dialog', { name: 'Navigation', exact: true })).toBeVisible();
});

test('RTL puts the sidebar on the right', async ({ page }) => {
  await page.locator('html').evaluate((h) => h.setAttribute('dir', 'rtl'));
  const side = await shellPart(page, 'sidebar');
  const main = await page.getByRole('main').boundingBox();
  expect(side.x).toBeGreaterThanOrEqual(main.x + main.width - 1);
});

for (const theme of THEMES)
  test(`axe-clean, wide and narrow with the drawer open, in the ${theme} theme`, async ({ page }) => {
    await gotoInTheme(page, '/app-shell.html', theme, 'focsd-app-shell');
    await expectAxeClean(page);
    await page.setViewportSize({ width: 600, height: 800 });
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await expectAxeClean(page);
  });
