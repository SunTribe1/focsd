import { expect, test } from './fixtures/test.js';
import { addThemeInitScript, expectTheme } from './fixtures/axe.js';

// The bottom navigation bar at phone width (wave 21a), light and dark, against committed baselines.
// Run in the final regression; create the baselines with:
//   pnpm exec playwright test --project=visual bottom-nav-visual --update-snapshots

test.use({ contextOptions: { reducedMotion: 'reduce' }, viewport: { width: 360, height: 640 } });

for (const theme of ['light', 'dark']) {
  test(`the bottom nav in ${theme} looks as before`, async ({ page }) => {
    await addThemeInitScript(page, theme);
    await page.goto('/bottom-nav.html');
    await page.waitForFunction(() => window.__ready);
    await expectTheme(page, theme);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('#nav')).toHaveScreenshot(`bottom-nav-${theme}.png`);
  });
}
