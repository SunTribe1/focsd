import { expect, test } from './fixtures/test.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() =>
    ['focsd-select', 'focsd-combobox', 'focsd-multi-select', 'focsd-option'].every((t) => customElements.get(t)),
  );
});

for (const tag of ['focsd-select', 'focsd-combobox', 'focsd-multi-select'])
  test(`${tag} is a block box in plain block flow and honours max-inline-size`, async ({ page }) => {
    const result = await page.evaluate(async (t) => {
      const box = document.createElement('div');
      box.style.cssText = 'display: block; inline-size: 600px';
      box.innerHTML = `<${t} id="blk" label="Region" style="max-inline-size: 20rem"><focsd-option value="a">A</focsd-option></${t}>`;
      document.body.append(box);
      const el = /** @type {any} */ (box.firstElementChild);
      await el.updateComplete;
      const out = { display: getComputedStyle(el).display, width: el.getBoundingClientRect().width };
      box.remove();

      return out;
    }, tag);

    expect(result.display).toBe(tag === 'focsd-select' ? 'block' : 'grid');
    expect(result.width).toBeLessThanOrEqual(320);
    expect(result.width).toBeGreaterThan(100);
  });
