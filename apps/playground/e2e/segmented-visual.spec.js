import { expect, test } from './fixtures/test.js';
import { addThemeInitScript, expectTheme } from './fixtures/axe.js';

// The segmented controls (wave 21a), light and dark, against committed baselines. Run in the final
// regression; create the baselines with:
//   pnpm exec playwright test --project=visual segmented-visual --update-snapshots

test.use({ contextOptions: { reducedMotion: 'reduce' } });

for (const theme of ['light', 'dark']) {
  test(`the segmented controls in ${theme} look as before`, async ({ page }) => {
    await addThemeInitScript(page, theme);
    await page.goto('/segmented.html');
    await page.waitForFunction(() => window.__ready);
    await expectTheme(page, theme);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('main')).toHaveScreenshot(`segmented-main-${theme}.png`);
  });
}
