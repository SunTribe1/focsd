import { expect, test } from './fixtures/test.js';
import { addThemeInitScript, expectTheme } from './fixtures/axe.js';

// One baseline per wave 18b chart type (area, stacked area, stacked bar, scatter, mirrored bar).
// Run in the final regression; create the baselines with:
//   pnpm exec playwright test --project=visual charts-types-visual --update-snapshots

test.use({ contextOptions: { reducedMotion: 'reduce' }, locale: 'en-US' });

for (const id of ['area', 'stacked-area', 'stacked', 'scatter', 'mirrored']) {
  test(`the ${id} chart looks as before`, async ({ page }) => {
    await addThemeInitScript(page, 'light');
    await page.goto('/charts.html');
    await expectTheme(page, 'light');
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.querySelectorAll('focsd-chart')].map((c) => c.updateComplete));
    });
    await expect(page.locator(`#${id}`)).toHaveScreenshot(`chart-${id}.png`);
  });
}
