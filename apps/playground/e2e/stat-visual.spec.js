import { expect, test } from './fixtures/test.js';
import { addThemeInitScript, expectTheme } from './fixtures/axe.js';

// The stat row and the status dots (wave 18d), light and dark, against committed baselines. Run in
// the final regression; create the baselines with:
//   pnpm exec playwright test --project=visual stat-visual --update-snapshots

test.use({ contextOptions: { reducedMotion: 'reduce' } });

for (const theme of ['light', 'dark']) {
  test(`the stat row and status dots in ${theme} look as before`, async ({ page }) => {
    await addThemeInitScript(page, theme);
    await page.goto('/stat.html');
    await page.waitForFunction(() => window.__ready);
    await expectTheme(page, theme);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('#stat-row')).toHaveScreenshot(`stat-row-${theme}.png`);
    await expect(page.locator('#dots')).toHaveScreenshot(`status-dots-${theme}.png`);
  });
}
