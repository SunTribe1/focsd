import { test } from './fixtures/test.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';

// Axe on charts-small.html in each theme. Run in the final regression, not per batch.

for (const theme of THEMES) {
  test(`charts-small.html has no axe violations in the ${theme} theme`, async ({ page }) => {
    await gotoInTheme(page, '/charts-small.html', theme, 'focsd-gauge');
    await page.evaluate(() => Promise.all([...document.querySelectorAll('focsd-sparkline, focsd-gauge')].map((e) => e.updateComplete)));
    await expectAxeClean(page);
  });
}
