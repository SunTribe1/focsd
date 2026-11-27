import { test } from './fixtures/test.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';

// Axe on signature.html in every theme (wave 21c), drawing and typed modes. Run in the final regression, not per batch.

for (const theme of THEMES) {
  test(`signature.html has no axe violations in ${theme}`, async ({ page }) => {
    await gotoInTheme(page, '/signature.html', theme, 'focsd-signature-pad');
    await page.waitForFunction(() => window.__ready);
    await expectAxeClean(page);
    await page.locator('#pad').evaluate(async (el) => {
      el.typed = true;
      el.setAttribute('error', 'Sign here to continue');
      await el.updateComplete;
    });
    await expectAxeClean(page);
  });
}
