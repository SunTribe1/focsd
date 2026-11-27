// Pointer targets follow the density (DESIGN.md): at least the density's control height, and never
// under the WCAG 2.2 AA minimum (--focsd-target-min, 24px). Comfortable density makes them 44px.
import { expect } from '@playwright/test';

/** The page's control height and target minimum, in px. */
const floors = (page) =>
  page.evaluate(() => {
    const probe = document.createElement('div');

    const px = (value) => {
      probe.style.inlineSize = value;

      return probe.getBoundingClientRect().width;
    };

    document.body.append(probe);
    const result = { control: px('var(--focsd-control-height)'), target: px('var(--focsd-target-min)') };

    probe.remove();

    return result;
  });

/**
 * Each locator is at least the control height of the current density (and the 24px minimum); then,
 * at comfortable density, at least 44px.
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator[]} locators
 */
export async function expectTargetsFollowDensity(page, locators) {
  const check = async (min, density) => {
    for (const locator of locators) {
      const box = await locator.boundingBox();

      expect(box?.width, `${density} width`).toBeGreaterThanOrEqual(min - 0.5);
      expect(box?.height, `${density} height`).toBeGreaterThanOrEqual(min - 0.5);
    }
  };

  const { control, target } = await floors(page);

  expect(target).toBeGreaterThanOrEqual(24);
  await check(Math.min(control, 44), 'default');
  await page.evaluate(() => document.documentElement.setAttribute('data-focsd-density', 'comfortable'));
  await expect.poll(async () => (await floors(page)).control).toBe(44);
  await check(44, 'comfortable');
  await page.evaluate(() => document.documentElement.removeAttribute('data-focsd-density'));
}
