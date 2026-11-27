// @vitest-environment happy-dom
// Wave 20 review minor 18: the data grid formats its number cells with setLocale() and re-renders when it changes.
import { afterEach, describe, expect, it } from 'vitest';
import { setLocale } from '@focsd/primitives/utils';

await import('../src/index.js');

afterEach(() => {
  setLocale(null);
  document.documentElement.removeAttribute('lang');
  document.body.replaceChildren();
});

describe('data grid re-renders on setLocale (minor 18)', () => {
  it('reformats number cells, and goes back with setLocale(null)', async () => {
    document.documentElement.setAttribute('lang', 'en-US');
    const el = /** @type {any} */ (document.createElement('focsd-data-grid'));

    el.label = 'Orders';
    el.columns = [{ id: 'name' }, { id: 'amount', type: 'number' }];
    el.rows = [
      { id: 1, name: 'Ada', amount: 1234.5 },
      { id: 2, name: 'Bo', amount: 2500.25 },
    ];
    document.body.append(el);
    await el.updateComplete;
    const before = el.shadowRoot.innerHTML;

    expect(before).toMatch(/1,234\.5/);
    setLocale('de');
    await el.updateComplete;
    expect(el.shadowRoot.innerHTML).toMatch(/1\.234,5/);
    setLocale(null);
    await el.updateComplete;
    expect(el.shadowRoot.innerHTML).toMatch(/1,234\.5/);
  });
});
