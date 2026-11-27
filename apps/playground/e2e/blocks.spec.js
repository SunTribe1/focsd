import { expect, test } from './fixtures/test.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';

// Blocks that 19b owns: dashboard. (settings, sign-in and empty-app live in blocks-forms.spec.js.)

const DASHBOARD = '/blocks/dashboard.html';

const WIDTHS = [
  { name: '360', width: 360, height: 800 },
  { name: '1280', width: 1280, height: 900 },
];

/** @param {import('@playwright/test').Page} page */
async function openDashboard(page, path = DASHBOARD) {
  const problems = [];

  page.on('pageerror', (error) => problems.push(error.message));
  page.on('console', (message) => message.type() === 'error' && problems.push(message.text()));
  await page.goto(path);
  await page.waitForFunction(() => ['focsd-app-shell', 'focsd-stat', 'focsd-chart', 'focsd-data-grid'].every((t) => customElements.get(t)));
  await page.waitForFunction(() => document.querySelector('focsd-data-grid')?.rows?.length === 20);
  await page.evaluate(() => document.fonts.ready);

  return problems;
}

test.describe('dashboard block', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  for (const { name, width, height } of WIDTHS) {
    test(`axe clean at ${name}px (light)`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await openDashboard(page);
      await expectAxeClean(page);
    });

    test(`no horizontal scroll at ${name}px`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await openDashboard(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  for (const theme of THEMES) {
    test(`axe clean in ${theme} at 1280px`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await gotoInTheme(page, DASHBOARD, theme, 'focsd-stat');
      await page.waitForFunction(() => document.querySelector('focsd-data-grid')?.rows?.length === 20);
      await expectAxeClean(page);
    });
  }
});

test.describe('dashboard block structure', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('landmarks: one main, one banner, a labelled navigation; one h1', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openDashboard(page);
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('banner')).toHaveCount(1);
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('the sidebar has five items and marks the current page', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openDashboard(page);
    await expect(page.locator('focsd-sidebar-item')).toHaveCount(5);
    await expect(page.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
  });

  test('the sidebar becomes a drawer below 768px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openDashboard(page);
    await expect(page.getByRole('button', { name: 'Open navigation' })).toHaveCount(0);
    await page.setViewportSize({ width: 700, height: 900 });
    const open = page.getByRole('button', { name: 'Open navigation' });

    await expect(open).toBeVisible();
    await open.click();
    await expect(page.getByRole('dialog', { name: 'Ledgerline' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(open).toBeFocused();
  });
});

test.describe('dashboard block behavior', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('stats wrap 4, then 2, then 1 column with the width', async ({ page }) => {
    const columns = () =>
      page.evaluate(
        () => new Set([...document.querySelectorAll('focsd-stat')].map((s) => Math.round(s.getBoundingClientRect().left))).size,
      );

    await page.setViewportSize({ width: 1400, height: 900 });
    await openDashboard(page);
    await expect(page.locator('focsd-stat')).toHaveCount(4);
    expect(await columns()).toBe(4);
    await page.setViewportSize({ width: 900, height: 900 });
    await expect.poll(columns).toBe(2);
    await page.setViewportSize({ width: 360, height: 800 });
    await expect.poll(columns).toBe(1);
  });

  test('two stats carry a sparkline', async ({ page }) => {
    await openDashboard(page);
    await expect(page.locator('focsd-stat focsd-sparkline')).toHaveCount(2);
  });

  test('the grid sorts and pages; it scrolls inside its wrapper at 360px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await openDashboard(page);
    const wrap = page.locator('.grid-wrap');
    const sizes = await wrap.evaluate((el) => ({ client: el.clientWidth, scroll: el.scrollWidth }));

    expect(sizes.scroll).toBeGreaterThanOrEqual(sizes.client);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

    const grid = page.locator('focsd-data-grid');
    const header = grid.getByRole('columnheader', { name: /Order/ });

    await header.click();
    await expect(header).toHaveAttribute('aria-sort', 'ascending');
    await expect(grid.getByRole('navigation')).toBeVisible();
  });

  test('no console errors and no undefined custom elements', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const problems = await openDashboard(page);

    expect(await page.evaluate(() => document.querySelectorAll(':not(:defined)').length)).toBe(0);
    expect(problems).toEqual([]);
  });
});

test.describe('dashboard block targets and forced colors', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('sidebar items and the account menu trigger are at least 36 px tall (the default density)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openDashboard(page);

    for (const locator of [
      ...(await page.locator('focsd-sidebar-item').all()),
      page.getByRole('button', { name: /account|menu/i }).first(),
    ]) {
      const box = await locator.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(36);
      expect(box.width).toBeGreaterThanOrEqual(24);
    }
  });

  test('forced colors: the page keeps its text and axe stays clean', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'forced-colors emulation is Chromium-only');
    await page.emulateMedia({ forcedColors: 'active' });
    await page.setViewportSize({ width: 1280, height: 900 });
    await openDashboard(page);

    const { text, canvas } = await page.evaluate(() => ({
      text: getComputedStyle(document.querySelector('h1')).color,
      canvas: getComputedStyle(document.body).backgroundColor,
    }));

    expect(text).not.toBe(canvas);
    await expectAxeClean(page);
  });
});
