import { test } from './fixtures/test.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';

// Axe on charts.html (bar, line, donut, area, stacked, scatter, mirrored) in each theme, with every
// data table open. Run in the final regression, not per batch.

for (const theme of THEMES) {
  test(`charts.html has no axe violations in the ${theme} theme`, async ({ page }) => {
    await gotoInTheme(page, '/charts.html', theme, 'focsd-chart');
    await page.evaluate(async () => {
      const charts = [...document.querySelectorAll('focsd-chart')];

      for (const c of charts) c.showTable = true;
      await Promise.all(charts.map((c) => c.updateComplete));
    });
    await expectAxeClean(page);
  });
}
