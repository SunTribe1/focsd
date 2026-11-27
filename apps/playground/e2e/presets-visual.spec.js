import { expect, test } from './fixtures/test.js';
import { renderComplete } from './fixtures/pages.js';
import { expectTheme } from './fixtures/axe.js';
import { BRANDS, addBrandInitScript, addPresetSheets } from './fixtures/brand.js';

// One page each for forms, data and overlays, in every preset (light and dark), against committed
// baselines. Update with: pnpm exec playwright test --project=visual presets-visual --update-snapshots

const PAGES = ['forms', 'data', 'overlays'];

test.use({ contextOptions: { reducedMotion: 'reduce' } });

for (const brand of BRANDS) {
  for (const theme of ['light', 'dark']) {
    for (const name of PAGES) {
      test(`${name}.html in ${brand} / ${theme} looks as before`, async ({ page }) => {
        await page.clock.setFixedTime(new Date('2026-03-15T10:00:00Z'));
        await addBrandInitScript(page, theme, brand);
        await page.goto(`/${name}.html`);
        await addPresetSheets(page);
        await expectTheme(page, theme);
        await expect(page.locator('html')).toHaveAttribute('data-focsd-brand', brand);
        await renderComplete(page);
        await expect(page).toHaveScreenshot(`presets-${name}-${brand}-${theme}.png`, { fullPage: true });
      });
    }
  }
}
