import { expect, test } from './fixtures/test.js';
import { pressTab } from './fixtures/keys.js';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/masonry.html');
  await page.waitForFunction(() => customElements.get('focsd-masonry'));
});

const lefts = (page) => page.locator('#m > article').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left)));

const overlapping = (page) =>
  page.locator('#m > article').evaluateAll((els) => {
    const r = els.map((e) => e.getBoundingClientRect());

    return r.some((a, i) =>
      r.some((b, j) => i !== j && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1),
    );
  });

/** How each layout mode is reached: the default (native or polyfilled grid), or the forced fallback. */
const MODES = {
  default: async () => {},
  fallback: (page) => page.locator('#force-fallback').click(),
};

for (const [mode, enter] of Object.entries(MODES)) {
  test(`${mode}: columns at desktop width, items start left to right, nothing overlaps`, async ({ page }) => {
    await enter(page);
    await expect.poll(async () => new Set((await lefts(page)).slice(0, 3)).size).toBe(3);
    const xs = await lefts(page);
    expect(xs[0]).toBeLessThan(xs[1]);
    expect(xs[1]).toBeLessThan(xs[2]);
    expect(await overlapping(page)).toBe(false);
  });

  test(`${mode}: one column on a phone`, async ({ page }) => {
    await enter(page);
    await page.setViewportSize({ width: 360, height: 800 });
    await expect.poll(async () => new Set(await lefts(page)).size).toBe(1);
    expect(await overlapping(page)).toBe(false);
  });
}

test('fallback re-lays out when an item grows, and the container grows with it', async ({ page }) => {
  await page.locator('#force-fallback').click();
  const before = await page.locator('#m').evaluate((el) => el.getBoundingClientRect().height);
  await page.locator('#m > article >> nth=0').evaluate((el) => (el.style.blockSize = '600px'));
  await expect.poll(() => overlapping(page)).toBe(false);
  await expect.poll(() => page.locator('#m').evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThan(before);
});

test('balanced order packs into the shortest column', async ({ page }) => {
  await page.locator('#force-fallback').click();
  await page.locator('#m').evaluate((el) => el.setAttribute('order', 'balanced'));
  await expect.poll(() => overlapping(page)).toBe(false);
});

test('focus order follows the DOM', async ({ page }) => {
  await page.locator('#m a').first().focus();
  await pressTab(page);
  await expect(page.locator('#m a').nth(1)).toBeFocused();
});

test('inside a flex container it still takes the available width', async ({ page }) => {
  await page.locator('#force-fallback').click();
  await page.locator('#mf').evaluate((el) => (el.nativeMasonry = false));
  await expect.poll(() => page.locator('#mf').evaluate((el) => el.getBoundingClientRect().width)).toBeGreaterThan(500);
  await expect
    .poll(() =>
      page.locator('#mf > article').evaluateAll((els) => new Set(els.map((e) => Math.round(e.getBoundingClientRect().left))).size),
    )
    .toBe(3);
});

test('page CSS sets the public gap and minimum column width', async ({ page }) => {
  await page.addStyleTag({ content: '#m { --focsd-masonry-gap: 40px; --focsd-masonry-min: 12rem; }' });

  const probe = await page.locator('#m').evaluate((el) => {
    const p = el.shadowRoot.querySelector('[part~="probe"]');

    return { gap: getComputedStyle(p).columnGap, width: p.offsetWidth };
  });

  expect(probe).toEqual({ gap: '40px', width: 192 });
});
