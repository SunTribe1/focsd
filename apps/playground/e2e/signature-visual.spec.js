import { expect, test } from './fixtures/test.js';
import { addThemeInitScript, expectTheme } from './fixtures/axe.js';

// The signature pad (wave 21c), empty, drawn and typed, light and dark, against committed
// baselines. Run in the final regression; create the baselines with:
//   pnpm exec playwright test --project=visual signature-visual --update-snapshots

test.use({ contextOptions: { reducedMotion: 'reduce' } });

for (const theme of ['light', 'dark']) {
  test(`the signature pads in ${theme} look as before`, async ({ page }) => {
    await addThemeInitScript(page, theme);
    await page.goto('/signature.html');
    await page.waitForFunction(() => window.__ready);
    await expectTheme(page, theme);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('#pad')).toHaveScreenshot(`signature-empty-${theme}.png`);

    const box = await page.locator('#pad').getByRole('img').boundingBox();
    await page.mouse.move(box.x + 30, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 120, box.y + 40, { steps: 6 });
    await page.mouse.move(box.x + 220, box.y + 110, { steps: 6 });
    await page.mouse.up();
    await page.mouse.move(0, 0);
    await expect(page.locator('#pad')).toHaveScreenshot(`signature-drawn-${theme}.png`);
    await expect(page.locator('#typed')).toHaveScreenshot(`signature-typed-${theme}.png`);
  });
}
