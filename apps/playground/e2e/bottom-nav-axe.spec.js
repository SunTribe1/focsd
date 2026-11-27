import { test } from './fixtures/test.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';

// Axe on bottom-nav.html in every theme at phone width (wave 21a). Run in the final regression, not per batch.

for (const theme of THEMES) {
  test(`bottom-nav.html has no axe violations in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await gotoInTheme(page, '/bottom-nav.html', theme, 'focsd-bottom-nav');
    await page.waitForFunction(() => window.__ready);
    await expectAxeClean(page);
  });
}
