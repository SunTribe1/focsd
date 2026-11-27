import { readFile } from 'node:fs/promises';

const dist = (f) => readFile(new URL(`../dist/${f}`, import.meta.url), 'utf8');

/** Load tokens.css (plus optional extra CSS after it) and the given body HTML. */
export async function mount(page, body = '', extraCss = '') {
  const css = await dist('tokens.css');
  await page.setContent(`<!doctype html><html><head><style>${css}</style><style>${extraCss}</style></head><body>${body}</body></html>`);
}

export const floorCss = () => dist('floor.css');

/** Resolve var(<cssVar>) as a color inside <selector>, rasterize to sRGB and return #rrggbb. */
export function hexOf(page, selector, cssVar) {
  return page.evaluate(
    ([sel, v]) => {
      const probe = document.createElement('span');
      probe.style.color = `var(${v})`;
      document.querySelector(sel).append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      const ctx = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d');
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;

      return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
    },
    [selector, cssVar],
  );
}

/** Computed value of a custom property on <selector>. */
export const propOf = (page, selector, cssVar) =>
  page.evaluate(([s, v]) => getComputedStyle(document.querySelector(s)).getPropertyValue(v).trim(), [selector, cssVar]);

/** Assert two hex colors are within ±1 per channel (browser color conversion rounding). */
export function expectHexClose(expect, actual, expected) {
  const channels = (h) => [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16));
  const [a, b] = [channels(actual), channels(expected)];
  expect(
    a.every((v, i) => Math.abs(v - b[i]) <= 1),
    `${actual} ≈ ${expected}`,
  ).toBe(true);
}
