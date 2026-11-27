import { expect, test } from './fixtures/test.js';
import { addThemeInitScript, expectTheme } from './fixtures/axe.js';

// charts-small.html against committed baselines: the sparkline types and the banded gauge. Update with:
//   pnpm exec playwright test --project=visual charts-small-visual --update-snapshots

test.use({ contextOptions: { reducedMotion: 'reduce' }, locale: 'en-US' });

for (const theme of ['light', 'dark']) {
  test(`charts-small.html in the ${theme} theme looks as before`, async ({ page }) => {
    await addThemeInitScript(page, theme);
    await page.goto('/charts-small.html');
    await expectTheme(page, theme);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.querySelectorAll('focsd-sparkline, focsd-gauge')].map((e) => e.updateComplete));
    });
    await expect(page).toHaveScreenshot(`charts-small-${theme}.png`, { fullPage: true });
  });
}
