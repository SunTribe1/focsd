import { test } from './fixtures/test.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';

// focsd-notification-center (wave 21d): axe with the panel closed and open, in each theme. Run in the
// final regression (owner rule: the theme matrix is deferred).

for (const theme of THEMES) {
  test(`notification center page is axe-clean in the ${theme} theme`, async ({ page }) => {
    await gotoInTheme(page, '/notifications.html', theme, 'focsd-notification-center');
    await expectAxeClean(page);
  });

  test(`the open notification panel is axe-clean in the ${theme} theme`, async ({ page }) => {
    await gotoInTheme(page, '/notifications.html', theme, 'focsd-notification-center');
    await page.locator('#center [part~="trigger"]').click();
    await page.locator('#center [part~="panel"]').waitFor();
    await expectAxeClean(page);
  });
}
