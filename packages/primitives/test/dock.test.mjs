// @vitest-environment happy-dom
// The dock: a compact segmented control (radio group, selection follows focus) of icon-and-label items.
import { afterEach, describe, expect, it } from 'vitest';
import './helpers/element-internals.js';
import { FocsdDockItemBase } from '../src/forms/dock-item-base.js';
import { FocsdDockBase } from '../src/forms/dock-base.js';

customElements.define('x-dock-item', FocsdDockItemBase);

customElements.define('x-dock', FocsdDockBase);

const MARKUP = `<x-dock label="Categories" name="cat" value="forms">
  <x-dock-item value="actions"><svg slot="icon"></svg>Actions</x-dock-item>
  <x-dock-item value="forms">Forms</x-dock-item>
  <x-dock-item value="data" disabled>Data</x-dock-item>
  <x-dock-item value="charts">Charts</x-dock-item>
</x-dock>`;

/** @returns {Promise<any>} */
async function mount(markup = MARKUP) {
  document.body.innerHTML = markup;
  const el = /** @type {any} */ (document.body.firstElementChild);

  await el.updateComplete;
  await Promise.all(el.items.map((/** @type {any} */ i) => i.updateComplete));
  await el.updateComplete;

  return el;
}

/** @param {any} el @param {string} key */
async function press(el, key) {
  const target = el.items.find((/** @type {Element} */ i) => i.getAttribute('tabindex') === '0');

  target?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true }));
  await el.updateComplete;
}

const selected = (/** @type {any} */ el) =>
  el.items.filter((/** @type {Element} */ i) => i.getAttribute('aria-checked') === 'true').map((/** @type {any} */ i) => i.value);

afterEach(() => document.body.replaceChildren());

describe('dock', () => {
  it('is a radiogroup named by its label, with items as radios', async () => {
    const el = await mount();
    const group = el.shadowRoot.querySelector('[part~="group"]');

    expect(group.getAttribute('role')).toBe('radiogroup');
    expect(group.getAttribute('aria-label')).toBe('Categories');
    expect(el.items.every((/** @type {Element} */ i) => i.getAttribute('role') === 'radio')).toBe(true);
    expect(selected(el)).toEqual(['forms']);
  });

  it('falls back to a localized name when no label is given', async () => {
    const el = await mount(MARKUP.replace(' label="Categories"', ''));

    expect(el.shadowRoot.querySelector('[part~="group"]').getAttribute('aria-label')).toBe('Views');
  });

  it('sets item and item-selected parts', async () => {
    const el = await mount();

    expect(el.items.map((/** @type {Element} */ i) => i.getAttribute('part'))).toEqual(['item', 'item item-selected', 'item', 'item']);
  });

  it('arrows move and select, skipping disabled items; Home and End go to the edges', async () => {
    const el = await mount();

    await press(el, 'ArrowRight');
    expect(el.value).toBe('charts');
    await press(el, 'Home');
    expect(el.value).toBe('actions');
    await press(el, 'End');
    expect(el.value).toBe('charts');
  });

  it('marks items when labels are hidden, keeping them as the accessible name', async () => {
    const el = await mount(MARKUP.replace('<x-dock ', '<x-dock label-display="hidden" '));

    expect(el.items.every((/** @type {Element} */ i) => i.hasAttribute('data-labels-hidden'))).toBe(true);
    el.labelDisplay = 'shown';
    await el.updateComplete;
    expect(el.items.some((/** @type {Element} */ i) => i.hasAttribute('data-labels-hidden'))).toBe(false);
  });

  it('renders a named icon or an icon slot', async () => {
    const el = await mount();
    const [first] = el.items;

    expect(first.shadowRoot.querySelector('slot[name="icon"]')).not.toBeNull();
  });
});
