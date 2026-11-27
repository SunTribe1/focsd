import { expect, test } from './fixtures/test.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/progress-ring.html');
  await page.waitForFunction(() => customElements.get('focsd-progress'));
});

test('the ring keeps progressbar semantics and shows the value in the center', async ({ page }) => {
  const ring = page.getByRole('progressbar', { name: 'Upload' });
  await expect(ring).toHaveAttribute('aria-valuenow', '40');
  await expect(page.locator('#r1 [part~="value"]')).toHaveText('40%');
  await expect(page.locator('#r1 [part~="value"]')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#r1 svg [part~="ring-indicator"]')).toBeAttached();
});

test('the size comes from --focsd-progress-ring-size', async ({ page }) => {
  const small = await page.locator('#r3 [part~="ring"]').boundingBox();
  expect(Math.round(small.width)).toBe(24);
});

test('indeterminate has no value and rotates, but not under reduced motion', async ({ page }) => {
  await expect(page.getByRole('progressbar', { name: 'Syncing' })).not.toHaveAttribute('aria-valuenow');
  expect(await page.locator('#r2 [part~="ring"]').evaluate((el) => getComputedStyle(el).animationName)).not.toBe('none');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.locator('#r2 [part~="ring"]').evaluate((el) => getComputedStyle(el).animationPlayState)).toBe('paused');
});

test('the bar variant is unchanged', async ({ page }) => {
  await expect(page.locator('#bar [part~="track"]')).toBeVisible();
  await expect(page.locator('#bar svg')).toHaveCount(0);
});

test('the arc follows the value, without animating it', async ({ page }) => {
  const arc = page.locator('#r1 [part~="ring-indicator"]');
  await expect(arc).toHaveAttribute('stroke-dasharray', '40 100');
  await page.locator('#r1').evaluate((el) => {
    el.value = 75;
  });
  await expect(arc).toHaveAttribute('stroke-dasharray', '75 100');
  await expect(page.locator('#r1 [part~="value"]')).toHaveText('75%');
  expect(await arc.evaluate((el) => getComputedStyle(el).transitionProperty)).not.toMatch(/stroke/);
});

/**
 * The computed stroke of each ring layer of #r1, beside the colors the given CSS values resolve to
 * on the page (a probe in the light DOM, where the theme's tokens apply).
 * @param {import('@playwright/test').Page} page
 * @param {Record<string, string>} expected
 */
const ringColors = (page, expected) =>
  page.locator('#r1').evaluate((el, values) => {
    const probe = document.createElement('span');
    document.body.append(probe);

    const want = Object.fromEntries(
      Object.entries(values).map(([key, value]) => {
        probe.style.color = value;

        return [key, getComputedStyle(probe).color];
      }),
    );

    probe.remove();

    const stroke = (/** @type {string} */ selector) => getComputedStyle(el.shadowRoot.querySelector(selector)).stroke;
    const edges = [...el.shadowRoot.querySelectorAll('.edge')].map((edge) => getComputedStyle(edge).stroke);

    return {
      got: { arc: stroke('[part~="ring-indicator"]'), track: stroke('[part~="ring-track"]'), edge: edges[0], edges: edges.length },
      want,
    };
  }, expected);

for (const theme of THEMES)
  test(`in the ${theme} theme the arc is the route color on a sunk track outlined by the edge color`, async ({ page }) => {
    await gotoInTheme(page, '/progress-ring.html', theme, 'focsd-progress');

    const { got, want } = await ringColors(page, {
      arc: 'var(--focsd-route)',
      track: 'var(--focsd-surface-sunk)',
      edge: 'var(--focsd-edge)',
    });

    expect(got).toEqual({ ...want, edges: 2 });
  });

test('in forced colors the arc is Highlight on a Canvas track outlined in CanvasText', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });

  const { got, want } = await ringColors(page, { arc: 'Highlight', track: 'Canvas', edge: 'CanvasText' });

  expect(got).toEqual({ ...want, edges: 2 });
});

for (const theme of THEMES)
  test(`axe-clean in the ${theme} theme`, async ({ page }) => {
    await gotoInTheme(page, '/progress-ring.html', theme, 'focsd-progress');
    await expectAxeClean(page);
  });
