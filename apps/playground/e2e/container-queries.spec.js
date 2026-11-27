import { expect, test } from './fixtures/test.js';

// Layout follows the space the component gets, not the viewport: a wide screen with the component in
// a narrow column must use the narrow layout.
test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/navigation.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-description-list')));
});

/** Put an element in a wrapper of the given width and wait for it to re-render. */
const within = (page, selector, width) =>
  page.evaluate(
    async ([sel, w]) => {
      const el = document.querySelector(sel);
      const box = el.parentElement.dataset.box ? el.parentElement : document.createElement('div');
      box.dataset.box = '';
      box.style.inlineSize = w;

      if (!box.isConnected) {
        el.before(box);
        box.append(el);
      }

      await el.updateComplete;
    },
    [selector, width],
  );

const columns = (page, selector, part) =>
  page.evaluate(
    ([sel, p]) => {
      const node = document.querySelector(sel).shadowRoot?.querySelector(`[part~="${p}"]`);

      return node ? getComputedStyle(node).gridTemplateColumns.split(' ').length : 0;
    },
    [selector, part],
  );

test('description list stacks terms over details in a narrow container', async ({ page }) => {
  await within(page, '#dl', '900px');
  await expect.poll(() => columns(page, '#dl > focsd-description-item', 'dl')).toBe(2);
  await within(page, '#dl', '320px');
  await expect.poll(() => columns(page, '#dl > focsd-description-item', 'dl')).toBe(1);
});

test('footer stacks its columns in a narrow container', async ({ page }) => {
  await within(page, '#ftr', '1000px');
  await expect.poll(() => columns(page, '#ftr', 'top')).toBeGreaterThan(1);
  await within(page, '#ftr', '320px');
  await expect.poll(() => columns(page, '#ftr', 'top')).toBe(1);
});
