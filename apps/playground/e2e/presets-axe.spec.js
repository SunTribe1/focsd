import { test, expect } from './fixtures/test.js';
import { THEMES, expectAxeClean, expectTheme } from './fixtures/axe.js';
import { BRANDS, addBrandInitScript } from './fixtures/brand.js';

// Axe on presets.html in every preset x theme. Run in the final regression, not per batch.

for (const brand of BRANDS) {
  for (const theme of THEMES) {
    test(`presets.html has no axe violations in ${brand} / ${theme}`, async ({ page }) => {
      await addBrandInitScript(page, theme, brand);
      await page.goto('/presets.html');
      await page.waitForFunction(() => window.__ready);
      await expectTheme(page, theme);
      await expect(page.locator('html')).toHaveAttribute('data-focsd-brand', brand);
      await page.evaluate(() => document.fonts.ready);
      await expectAxeClean(page);
    });
  }
}
