// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FocsdImageCompareBase, comparePositionAt, comparePositionForKey } from '../src/display/image-compare-base.js';

customElements.define('x-image-compare', FocsdImageCompareBase);

/** @param {string} key @param {Partial<KeyboardEventInit>} [init] */
const key = (name, init = {}) => ({ key: name, shiftKey: false, ...init });

describe('comparePositionForKey', () => {
  const ltr = { rtl: false, vertical: false };

  it('arrows move 1, Shift+arrow and Page keys 10, Home and End go to the ends', () => {
    expect(comparePositionForKey(50, key('ArrowRight'), ltr)).toBe(51);
    expect(comparePositionForKey(50, key('ArrowUp'), ltr)).toBe(51);
    expect(comparePositionForKey(50, key('ArrowLeft'), ltr)).toBe(49);
    expect(comparePositionForKey(50, key('ArrowDown'), ltr)).toBe(49);
    expect(comparePositionForKey(50, key('ArrowRight', { shiftKey: true }), ltr)).toBe(60);
    expect(comparePositionForKey(50, key('PageUp'), ltr)).toBe(60);
    expect(comparePositionForKey(50, key('PageDown'), ltr)).toBe(40);
    expect(comparePositionForKey(50, key('Home'), ltr)).toBe(0);
    expect(comparePositionForKey(50, key('End'), ltr)).toBe(100);
  });

  it('stays within 0 to 100', () => {
    expect(comparePositionForKey(95, key('PageUp'), ltr)).toBe(100);
    expect(comparePositionForKey(3, key('ArrowLeft', { shiftKey: true }), ltr)).toBe(0);
  });

  it('mirrors Left and Right under RTL, where the before image sits on the right', () => {
    const rtl = { rtl: true, vertical: false };

    expect(comparePositionForKey(50, key('ArrowLeft'), rtl)).toBe(51);
    expect(comparePositionForKey(50, key('ArrowRight'), rtl)).toBe(49);
    expect(comparePositionForKey(50, key('ArrowUp'), rtl)).toBe(51);
  });

  it('vertical follows the APG slider: Up and Right raise the value, Down and Left lower it', () => {
    const vertical = { rtl: false, vertical: true };

    expect(comparePositionForKey(50, key('ArrowUp'), vertical)).toBe(51);
    expect(comparePositionForKey(50, key('ArrowRight'), vertical)).toBe(51);
    expect(comparePositionForKey(50, key('ArrowDown'), vertical)).toBe(49);
    expect(comparePositionForKey(50, key('ArrowLeft'), vertical)).toBe(49);
    expect(comparePositionForKey(50, key('ArrowLeft'), { rtl: true, vertical: true })).toBe(49);
  });

  it('leaves other keys alone', () => {
    expect(comparePositionForKey(50, key('Tab'), ltr)).toBeNull();
    expect(comparePositionForKey(50, key('a'), ltr)).toBeNull();
  });
});

describe('comparePositionAt', () => {
  const rect = { left: 100, top: 50, width: 200, height: 100 };

  it('is the share of the figure before the pointer, rounded and clamped', () => {
    expect(comparePositionAt(rect, 150, 0, { rtl: false, vertical: false })).toBe(25);
    expect(comparePositionAt(rect, 20, 0, { rtl: false, vertical: false })).toBe(0);
    expect(comparePositionAt(rect, 999, 0, { rtl: false, vertical: false })).toBe(100);
  });

  it('counts from the right under RTL and from the top when vertical', () => {
    expect(comparePositionAt(rect, 150, 0, { rtl: true, vertical: false })).toBe(75);
    expect(comparePositionAt(rect, 0, 75, { rtl: false, vertical: true })).toBe(25);
  });

  it('a figure with no size gives 0 instead of NaN', () => {
    expect(comparePositionAt({ left: 0, top: 0, width: 0, height: 0 }, 10, 10, { rtl: false, vertical: false })).toBe(0);
  });
});

/**
 * @param {string} markup
 * @returns {Promise<any>}
 */
async function mount(markup) {
  document.body.innerHTML = markup;
  const el = /** @type {any} */ (document.body.firstElementChild);

  await el.updateComplete;

  return el;
}

const IMAGES = '<img slot="before" alt="The bridge in 1990"><img slot="after" alt="The bridge today">';

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe('focsd-image-compare element', () => {
  it('renders a named slider with value text, and both alts describe it', async () => {
    const el = await mount(`<x-image-compare lang="en" position="60">${IMAGES}</x-image-compare>`);
    await el.updateComplete;
    const handle = el.shadowRoot.querySelector('[part~="handle"]');

    expect(handle.getAttribute('role')).toBe('slider');
    expect(handle.getAttribute('aria-label')).toBe('Compare images');
    expect(handle.getAttribute('aria-valuenow')).toBe('60');
    expect(handle.getAttribute('aria-valuemin')).toBe('0');
    expect(handle.getAttribute('aria-valuemax')).toBe('100');
    expect(handle.getAttribute('aria-valuetext')).toBe('60% before image');
    expect(handle.getAttribute('aria-orientation')).toBe('horizontal');
    expect(handle.getAttribute('tabindex')).toBe('0');

    const description = el.shadowRoot.getElementById(handle.getAttribute('aria-describedby'));
    expect(description.textContent.trim()).toBe('The bridge in 1990, The bridge today');
  });

  it('uses its label as the name and clamps an out-of-range position', async () => {
    const el = await mount(`<x-image-compare lang="en" label="Bridge" position="140">${IMAGES}</x-image-compare>`);
    const handle = el.shadowRoot.querySelector('[part~="handle"]');

    expect(handle.getAttribute('aria-label')).toBe('Bridge');
    expect(handle.getAttribute('aria-valuenow')).toBe('100');
  });
});

describe('focsd-image-compare element: keys and warnings', () => {
  it('a key press moves the position and fires focsd-position-change', async () => {
    const el = await mount(`<x-image-compare lang="en">${IMAGES}</x-image-compare>`);
    const seen = [];
    el.addEventListener('focsd-position-change', (/** @type {CustomEvent} */ e) => seen.push(e.detail.position));
    const handle = el.shadowRoot.querySelector('[part~="handle"]');

    const event = new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true, cancelable: true });
    handle.dispatchEvent(event);
    await el.updateComplete;

    expect(el.position).toBe(60);
    expect(seen).toEqual([60]);
    expect(event.defaultPrevented).toBe(true);
  });

  it('a key that does not move it (End at 100) fires nothing', async () => {
    const el = await mount(`<x-image-compare lang="en" position="100">${IMAGES}</x-image-compare>`);
    const listener = vi.fn();
    el.addEventListener('focsd-position-change', listener);
    el.shadowRoot.querySelector('[part~="handle"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    await el.updateComplete;

    expect(listener).not.toHaveBeenCalled();
  });

  it('vertical orientation is on the slider', async () => {
    const el = await mount(`<x-image-compare lang="en" orientation="vertical">${IMAGES}</x-image-compare>`);

    expect(el.shadowRoot.querySelector('[part~="handle"]').getAttribute('aria-orientation')).toBe('vertical');
  });

  it('warns when an image has no alt', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await mount('<x-image-compare lang="en"><img slot="before"><img slot="after" alt="After"></x-image-compare>');
    await new Promise((r) => setTimeout(r));

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('alt'), expect.anything());
  });
});
