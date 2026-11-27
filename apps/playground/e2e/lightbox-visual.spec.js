import { expect, test } from './fixtures/test.js';
import { addThemeInitScript, expectTheme } from './fixtures/axe.js';

// The lightbox gallery, the open viewer and image compare (wave 21b), light and dark, against
// committed baselines. Run in the final regression; create the baselines with:
//   pnpm exec playwright test --project=visual lightbox-visual --update-snapshots

test.use({ contextOptions: { reducedMotion: 'reduce' } });

for (const theme of ['light', 'dark']) {
  test(`the lightbox gallery and open viewer in ${theme} look as before`, async ({ page }) => {
    await addThemeInitScript(page, theme);
    await page.goto('/lightbox.html');
    await page.waitForFunction(() => window.__ready);
    await expectTheme(page, theme);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('#gallery')).toHaveScreenshot(`lightbox-gallery-${theme}.png`);

    await page.getByRole('link', { name: 'A lake under a pale sky' }).click();
    const viewer = page.getByRole('dialog', { name: 'Landscapes' });
    await expect(viewer).toContainText('Image 1 of 4');
    await expect(page).toHaveScreenshot(`lightbox-open-${theme}.png`);
  });

  test(`image compare in ${theme} looks as before`, async ({ page }) => {
    await addThemeInitScript(page, theme);
    await page.goto('/image-compare.html');
    await page.waitForFunction(() => window.__ready);
    await expectTheme(page, theme);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('#bridge')).toHaveScreenshot(`image-compare-${theme}.png`);
  });
}
