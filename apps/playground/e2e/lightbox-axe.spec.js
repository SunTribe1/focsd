import { expect, test } from './fixtures/test.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';

// Axe on lightbox.html in every theme, closed and with the viewer open (wave 21b). Run in the final
// regression, not per batch.

for (const theme of THEMES) {
  test(`lightbox.html has no axe violations in ${theme}`, async ({ page }) => {
    await gotoInTheme(page, '/lightbox.html', theme, 'focsd-lightbox');
    await page.waitForFunction(() => window.__ready);
    await expectAxeClean(page);

    await page.getByRole('link', { name: 'A lake under a pale sky' }).click();
    await expect(page.getByRole('dialog', { name: 'Landscapes' })).toBeVisible();
    await expectAxeClean(page);
  });
}
