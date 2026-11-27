// @vitest-environment happy-dom
// Wave 20 review minor 18: the charts format their numbers with setLocale() and re-render when it changes.
import { afterEach, describe, expect, it } from 'vitest';
import { setLocale } from '@focsd/primitives/utils';

await import('../src/index.js');

afterEach(() => {
  setLocale(null);
  document.documentElement.removeAttribute('lang');
  document.body.replaceChildren();
});

const data = [
  { label: 'Jan', sales: 1234.5 },
  { label: 'Feb', sales: 2500.25 },
];

describe('charts re-render on setLocale (minor 18)', () => {
  it.each([
    ['chart', () => Object.assign(document.createElement('focsd-chart'), { label: 'Sales', type: 'bar', data })],
    ['sparkline', () => Object.assign(document.createElement('focsd-sparkline'), { label: 'Sales', values: [1234.5, 2500.25] })],
    ['gauge', () => Object.assign(document.createElement('focsd-gauge'), { label: 'Load', value: 1234.5, max: 5000 })],
  ])('%s', async (_name, make) => {
    document.documentElement.setAttribute('lang', 'en-US');
    const el = /** @type {any} */ (make());

    document.body.append(el);
    await el.updateComplete;
    const before = el.shadowRoot.innerHTML;

    expect(before).toMatch(/1,234\.5/);
    setLocale('de');
    await el.updateComplete;
    expect(el.shadowRoot.innerHTML).toMatch(/1\.234,5/);
    setLocale(null);
    await el.updateComplete;
    expect(el.shadowRoot.innerHTML).toBe(before);
  });
});
