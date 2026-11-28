import { expect, test } from './fixtures/test.js';
import { addThemeInitScript, expectTheme } from './fixtures/axe.js';

// The notification center (wave 21d), closed and with its panel open, light and dark, against
// committed baselines. Run in the final regression; create the baselines with:
//   pnpm exec playwright test --project=visual notifications-visual --update-snapshots

test.use({ contextOptions: { reducedMotion: 'reduce' } });

for (const theme of ['light', 'dark']) {
  test(`the notification center in ${theme} looks as before`, async ({ page }) => {
    // A fixed clock keeps the relative times ("2 minutes ago") the same in every run.
    await page.clock.setFixedTime(new Date('2026-11-25T12:00:00Z'));
    await addThemeInitScript(page, theme);
    await page.goto('/notifications.html');
    await page.waitForFunction(() => window.__ready);
    await expectTheme(page, theme);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('main')).toHaveScreenshot(`notifications-main-${theme}.png`);
    await page.locator('#center [part~="trigger"]').click();
    await expect(page.locator('#center [part~="panel"]')).toHaveScreenshot(`notifications-panel-${theme}.png`);
  });
}
