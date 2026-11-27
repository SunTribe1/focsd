// @vitest-environment happy-dom
// Wave 21a: the segmented control (an APG radio group with selection following focus) and its segments.
import { afterEach, describe, expect, it } from 'vitest';
import './helpers/element-internals.js';
import { FocsdSegmentBase } from '../src/forms/segment-base.js';
import { FocsdSegmentedControlBase } from '../src/forms/segmented-control-base.js';

customElements.define('x-segment', FocsdSegmentBase);

customElements.define('x-segmented', FocsdSegmentedControlBase);

const MARKUP = `<x-segmented label="View" name="view" value="week">
  <x-segment value="day">Day</x-segment>
  <x-segment value="week">Week</x-segment>
  <x-segment value="month" disabled>Month</x-segment>
  <x-segment value="year">Year</x-segment>
</x-segmented>`;

/**
 * @param {string} markup
 * @returns {Promise<FocsdSegmentedControlBase & { shadowRoot: ShadowRoot }>}
 */
async function mount(markup = MARKUP) {
  document.body.innerHTML = markup;
  const el = /** @type {any} */ (document.body.firstElementChild);

  await el.updateComplete;
  await Promise.all(el.segments.map((/** @type {any} */ s) => s.updateComplete));
  await el.updateComplete;

  return el;
}

/** @param {FocsdSegmentedControlBase} el */
const checked = (el) => el.segments.filter((s) => s.getAttribute('aria-checked') === 'true').map((s) => s.value);

/** @param {FocsdSegmentedControlBase} el */
const tabStops = (el) => el.segments.filter((s) => s.getAttribute('tabindex') === '0').map((s) => s.value);

/**
 * @param {FocsdSegmentedControlBase} el
 * @param {string} key
 */
async function press(el, key) {
  const target = el.segments.find((s) => s.getAttribute('tabindex') === '0');
  const event = new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true });

  target?.dispatchEvent(event);
  await el.updateComplete;

  return event;
}

afterEach(() => document.body.replaceChildren());

describe('segmented control', () => {
  it('is a radiogroup named by its label, with segments as radios', async () => {
    const el = await mount();
    const group = el.shadowRoot.querySelector('[part~="group"]');
    const labelId = group?.getAttribute('aria-labelledby') ?? '';

    expect(group?.getAttribute('role')).toBe('radiogroup');
    expect(el.shadowRoot.getElementById(labelId)?.textContent).toBe('View');
    expect(el.segments.map((s) => s.getAttribute('role'))).toEqual(['radio', 'radio', 'radio', 'radio']);
    expect(el.segments[2].getAttribute('aria-disabled')).toBe('true');
  });

  it('falls back to the "Options" name when it has no label', async () => {
    const el = await mount('<x-segmented><x-segment value="a">A</x-segment></x-segmented>');
    const group = el.shadowRoot.querySelector('[part~="group"]');

    expect(group?.getAttribute('aria-label')).toBe('Options');
    expect(group?.hasAttribute('aria-labelledby')).toBe(false);
  });

  it('checks the segment matching the value and makes it the only tab stop', async () => {
    const el = await mount();

    expect(checked(el)).toEqual(['week']);
    expect(tabStops(el)).toEqual(['week']);
  });
});

describe('segmented control keys', () => {
  it('arrows move and select (selection follows focus), skipping disabled segments and wrapping', async () => {
    const el = await mount();
    /** @type {string[]} */
    const events = [];

    el.addEventListener('input', () => events.push(`input:${el.value}`));
    el.addEventListener('change', () => events.push(`change:${el.value}`));

    expect((await press(el, 'ArrowRight')).defaultPrevented).toBe(true);
    expect(el.value).toBe('year');
    await press(el, 'ArrowRight');
    expect(el.value).toBe('day');
    await press(el, 'ArrowLeft');
    expect(el.value).toBe('year');
    await press(el, 'ArrowUp');
    expect(el.value).toBe('week');
    await press(el, 'ArrowDown');
    expect(el.value).toBe('year');
    expect(checked(el)).toEqual(['year']);
    expect(tabStops(el)).toEqual(['year']);
    expect(events).toEqual([
      'input:year',
      'change:year',
      'input:day',
      'change:day',
      'input:year',
      'change:year',
      'input:week',
      'change:week',
      'input:year',
      'change:year',
    ]);
  });

  it('Home and End go to the first and last enabled segment', async () => {
    const el = await mount(`<x-segmented label="Size" value="m">
      <x-segment value="xs" disabled>XS</x-segment><x-segment value="s">S</x-segment>
      <x-segment value="m">M</x-segment><x-segment value="l">L</x-segment><x-segment value="xl" disabled>XL</x-segment>
    </x-segmented>`);

    expect((await press(el, 'Home')).defaultPrevented).toBe(true);
    expect(el.value).toBe('s');
    await press(el, 'End');
    expect(el.value).toBe('l');
  });
});

describe('segmented control state', () => {
  it('a click selects a segment; a disabled segment or a disabled control ignores it', async () => {
    const el = await mount();

    el.segments[0].click();
    await el.updateComplete;
    expect(el.value).toBe('day');
    el.segments[2].click();
    await el.updateComplete;
    expect(el.value).toBe('day');
    el.disabled = true;
    await el.updateComplete;
    el.segments[3].click();
    await el.updateComplete;
    expect(el.value).toBe('day');
    expect(tabStops(el)).toEqual([]);
  });

  it('submits its value, and required with no value is valueMissing', async () => {
    const el = /** @type {any} */ (await mount());

    expect(el.internals.formValue).toBe('week');
    el.value = '';
    el.required = true;
    await el.updateComplete;
    expect(el.internals.formValue).toBeNull();
    expect(el.internals.validity.valueMissing).toBe(true);
    el.value = 'day';
    await el.updateComplete;
    expect(el.internals.validity.valid).toBe(true);
  });

  it('marks the segments with the segment and segment-selected parts', async () => {
    const el = await mount();

    expect(el.segments.map((s) => s.getAttribute('part'))).toEqual(['segment', 'segment segment-selected', 'segment', 'segment']);
  });

  it('reflects size, defaulting to m', async () => {
    const el = await mount();

    expect(el.size).toBe('m');
    el.size = 's';
    await el.updateComplete;
    expect(el.getAttribute('size')).toBe('s');
  });
});

describe('segment', () => {
  it('renders its icon (decorative) before the label', async () => {
    const el = await mount('<x-segmented label="Layout"><x-segment value="grid" icon="menu">Grid</x-segment></x-segmented>');
    const segment = /** @type {FocsdSegmentBase & { shadowRoot: ShadowRoot }} */ (el.segments[0]);
    const iconPart = segment.shadowRoot.querySelector('[part~="icon"]');

    expect(iconPart?.getAttribute('aria-hidden')).toBe('true');
    expect(segment.shadowRoot.querySelector('[part~="label"] slot')).not.toBeNull();
  });

  it('shows no icon box without an icon (the icon slot stays, hidden, for slotted icons)', async () => {
    const el = await mount();
    const segment = /** @type {FocsdSegmentBase & { shadowRoot: ShadowRoot }} */ (el.segments[0]);
    const box = /** @type {HTMLElement | null} */ (segment.shadowRoot.querySelector('[part~="icon"]'));

    expect(box?.hidden).toBe(true);
    expect(box?.querySelector('slot[name="icon"]')).not.toBeNull();
  });
});
