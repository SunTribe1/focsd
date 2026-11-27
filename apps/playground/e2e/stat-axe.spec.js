import { test } from './fixtures/test.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';

// Axe on stat.html in every theme (wave 18d). Run in the final regression, not per batch.

for (const theme of THEMES) {
  test(`stat.html has no axe violations in ${theme}`, async ({ page }) => {
    await gotoInTheme(page, '/stat.html', theme, 'focsd-status-dot');
    await page.waitForFunction(() => window.__ready);
    await expectAxeClean(page);
  });
}
