import { test } from './fixtures/test.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';

// Axe on segmented.html in every theme (wave 21a). Run in the final regression, not per batch.

for (const theme of THEMES) {
  test(`segmented.html has no axe violations in ${theme}`, async ({ page }) => {
    await gotoInTheme(page, '/segmented.html', theme, 'focsd-segmented-control');
    await page.waitForFunction(() => window.__ready);
    await expectAxeClean(page);
  });
}
