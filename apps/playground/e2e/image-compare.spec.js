import { expect, test } from './fixtures/test.js';
import { boxOf } from './fixtures/dom.js';
import { expectAxeClean } from './fixtures/axe.js';

// Wave 21b: focsd-image-compare on image-compare.html.

/** @param {import('@playwright/test').Page} page */
const open = async (page) => {
  await page.goto('/image-compare.html');
  await page.waitForFunction(() => window.__ready);
};

/** The clip on the before image, read from its computed style. */
const clipOf = (page, id) =>
  page.evaluate((i) => {
    const before = document.getElementById(i)?.shadowRoot?.querySelector('[part~="before"]');

    return before ? getComputedStyle(before).clipPath : '';
  }, id);

test.describe('image compare: semantics and keys', () => {
  test('the handle is a named slider with value text and both alts as its description', async ({ page }) => {
    await open(page);
    const slider = page.getByRole('slider', { name: 'Bridge, 1990 and today' });

    await expect(slider).toHaveAttribute('aria-valuenow', '50');
    await expect(slider).toHaveAttribute('aria-valuetext', '50% before image');
    await expect(slider).toHaveAttribute('aria-orientation', 'horizontal');
    await expect(slider).toHaveAccessibleDescription('The bridge in 1990, brown steel, The bridge today, painted red');
    await expect(page.getByRole('slider', { name: 'Compare images' }).first()).toBeVisible();
  });

  test('keys: arrows 1, Shift+arrow and Page keys 10, Home and End', async ({ page }) => {
    await open(page);
    const slider = page.getByRole('slider', { name: 'Bridge, 1990 and today' });
    await slider.focus();

    await page.keyboard.press('ArrowRight');
    await expect(slider).toHaveAttribute('aria-valuenow', '51');
    await page.keyboard.press('Shift+ArrowLeft');
    await expect(slider).toHaveAttribute('aria-valuenow', '41');
    await page.keyboard.press('PageUp');
    await expect(slider).toHaveAttribute('aria-valuetext', '51% before image');
    await page.keyboard.press('PageDown');
    await page.keyboard.press('ArrowDown');
    await expect(slider).toHaveAttribute('aria-valuenow', '40');
    await page.keyboard.press('End');
    await expect(slider).toHaveAttribute('aria-valuenow', '100');
    await page.keyboard.press('Home');
    await expect(slider).toHaveAttribute('aria-valuenow', '0');
    await expect(page.locator('#committed')).toHaveText('0%');
  });

  test('the clip follows the position', async ({ page }) => {
    await open(page);
    expect(await clipOf(page, 'bridge')).toBe('inset(0px 50% 0px 0px)');

    await page.getByRole('slider', { name: 'Bridge, 1990 and today' }).focus();
    await page.keyboard.press('PageUp');
    await expect.poll(() => clipOf(page, 'bridge')).toBe('inset(0px 40% 0px 0px)');
  });
});

test.describe('image compare: direction, pointer and size', () => {
  test('Left and Right are mirrored under RTL, and the clip starts on the right', async ({ page }) => {
    await open(page);
    const slider = page.locator('#rtl').getByRole('slider');
    await slider.focus();

    await page.keyboard.press('ArrowLeft');
    await expect(slider).toHaveAttribute('aria-valuenow', '51');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(slider).toHaveAttribute('aria-valuenow', '49');
    expect(await clipOf(page, 'rtl')).toBe('inset(0px 0px 0px 51%)');
  });
});

test.describe('image compare: vertical', () => {
  test('vertical: Up raises the value like any slider (APG), Down lowers it', async ({ page }) => {
    await open(page);
    const slider = page.locator('#vertical').getByRole('slider');
    await slider.focus();

    await expect(slider).toHaveAttribute('aria-orientation', 'vertical');
    await page.keyboard.press('ArrowUp');
    await expect(slider).toHaveAttribute('aria-valuenow', '31');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(slider).toHaveAttribute('aria-valuenow', '29');
  });

  test('a pointer drag anywhere on the figure moves the divider and commits once', async ({ page }) => {
    await open(page);
    await page.evaluate(() => {
      window.__positions = [];
      document.querySelector('#bridge')?.addEventListener('focsd-position-change', (e) => window.__positions.push(e.detail.position));
    });
    const box = await boxOf(page.locator('#bridge'));
    const y = box.y + box.height * 0.8;

    await page.mouse.move(box.x + box.width * 0.2, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.5, y, { steps: 3 });
    await page.mouse.move(box.x + box.width * 0.75, y, { steps: 3 });
    await page.mouse.up();

    const slider = page.getByRole('slider', { name: 'Bridge, 1990 and today' });
    await expect(slider).toHaveAttribute('aria-valuenow', '75');
    await expect(slider).toBeFocused();
    expect(await page.evaluate(() => window.__positions)).toEqual([75]);
  });

  test('the handle follows the density, never under the 24 px minimum', async ({ page }) => {
    await open(page);
    const handle = page.getByRole('slider', { name: 'Bridge, 1990 and today' });
    const width = async () => (await handle.boundingBox())?.width ?? 0;

    expect(await width()).toBeGreaterThanOrEqual(24);
    const normal = await width();

    await page.evaluate(() => document.documentElement.setAttribute('data-focsd-density', 'comfortable'));
    await expect.poll(width).toBeGreaterThan(normal);
    await page.evaluate(() => document.documentElement.setAttribute('data-focsd-density', 'compact'));
    await expect.poll(width).toBeGreaterThanOrEqual(24);
  });

  test('passes axe', async ({ page }) => {
    await open(page);
    await expectAxeClean(page);
  });
});
