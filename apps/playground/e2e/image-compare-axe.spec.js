import { test } from './fixtures/test.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';

// Axe on image-compare.html in every theme (wave 21b). Run in the final regression, not per batch.

for (const theme of THEMES) {
  test(`image-compare.html has no axe violations in ${theme}`, async ({ page }) => {
    await gotoInTheme(page, '/image-compare.html', theme, 'focsd-image-compare');
    await page.waitForFunction(() => window.__ready);
    await expectAxeClean(page);
  });
}
