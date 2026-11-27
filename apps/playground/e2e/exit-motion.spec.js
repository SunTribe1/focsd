import { expect, test } from './fixtures/test.js';

// Overlays fade out instead of vanishing: the closed state is the "from" state, and `display` /
// `overlay` transition with allow-discrete so the element stays rendered while it fades. Engines
// without allow-discrete keep the instant close.
const closedState = (page, host, part) =>
  page.evaluate(
    ([h, p]) => {
      const node = document.querySelector(h)?.shadowRoot?.querySelector(`[part~="${p}"]`);

      if (!node) return null;
      const style = getComputedStyle(node);

      return { opacity: style.opacity, behavior: style.transitionBehavior, property: style.transitionProperty };
    },
    [host, part],
  );

test('a closed popover rests at its exit state and transitions display discretely', async ({ page }) => {
  await page.goto('/overlays.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-popover')));
  test.skip(!(await page.evaluate(() => CSS.supports('transition-behavior: allow-discrete'))), 'no allow-discrete');
  await expect.poll(() => closedState(page, '#pop', 'panel')).toMatchObject({ opacity: '0' });
  const state = await closedState(page, '#pop', 'panel');
  expect(state.property).toContain('display');
  expect(state.behavior).toContain('allow-discrete');
});

test('a closing dialog leaves the accessibility tree at once', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-dialog')));
  await page.locator('#dlg').evaluate((el) => el.show());
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  // No waiting: a modal that is closing must not stay reachable while it would fade.
  const exposed = await page.locator('#dlg').evaluate(async (el) => {
    el.close();
    await el.updateComplete;
    const node = el.shadowRoot.querySelector('[part~="dialog"]');

    return getComputedStyle(node).display !== 'none';
  });

  expect(exposed).toBe(false);
});

test('a panel that is not a popover is never put in the closed state', async ({ page }) => {
  await page.goto('/color.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-color-picker')));
  const inline = page.locator('focsd-color-picker[inline]');
  await expect(inline.getByRole('slider').first()).toBeVisible();
  expect(await inline.evaluate((el) => getComputedStyle(el.shadowRoot.querySelector('[part~="panel"]')).opacity)).toBe('1');
});
