// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FocsdAnimatedNumberBase } from '../src/display/animated-number-base.js';
import { FocsdStatBase } from '../src/display/stat-base.js';
import { FocsdStatusDotBase, STATUS_GLYPHS } from '../src/display/status-dot-base.js';
import { registerTranslation } from '../src/internal/localize.js';

customElements.define('x-animated-number', FocsdAnimatedNumberBase);

customElements.define(
  'x-stat',
  class extends FocsdStatBase {
    static numberTag = 'x-animated-number';
  },
);

customElements.define('x-status-dot', FocsdStatusDotBase);

/** @param {boolean} reduce */
const stubMotion = (reduce) =>
  vi.stubGlobal('matchMedia', (/** @type {string} */ query) => ({
    matches: reduce && query === '(prefers-reduced-motion: reduce)',
    addEventListener() {},
    removeEventListener() {},
  }));

/**
 * @template {HTMLElement} T
 * @param {string} markup
 * @returns {Promise<T & { updateComplete: Promise<boolean>, shadowRoot: ShadowRoot }>}
 */
async function mount(markup) {
  document.body.innerHTML = markup;
  const el = /** @type {any} */ (document.body.firstElementChild);

  await el.updateComplete;

  return el;
}

/** @param {Element} el @param {string} selector */
const text = (el, selector) => el.shadowRoot?.querySelector(selector)?.textContent?.trim() ?? '';

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe('animated number', () => {
  it('formats the value with the Intl options, and screen readers get only the final value', async () => {
    stubMotion(false);

    const el = await mount(
      `<x-animated-number lang="en" value="1234.5" format='{"style":"currency","currency":"USD"}'></x-animated-number>`,
    );

    expect(text(el, '[part~="number"]')).toBe('$1,234.50');
    expect(el.shadowRoot.querySelector('[part~="number"]')?.getAttribute('aria-hidden')).toBe('true');
    expect(text(el, '.focsd-visually-hidden')).toBe('$1,234.50');
  });

  it('jumps to the final value in the same update under reduced motion', async () => {
    stubMotion(true);
    const raf = vi.fn();
    vi.stubGlobal('requestAnimationFrame', raf);
    const el = /** @type {any} */ (await mount('<x-animated-number lang="en" value="10"></x-animated-number>'));

    el.value = 5000;
    await el.updateComplete;

    expect(text(el, '[part~="number"]')).toBe('5,000');
    expect(raf).not.toHaveBeenCalled();
  });
});

describe('animated number counting', () => {
  it('counts from the previous value while the hidden copy already holds the final one', async () => {
    stubMotion(false);
    /** @type {FrameRequestCallback[]} */
    const frames = [];
    vi.stubGlobal('requestAnimationFrame', (/** @type {FrameRequestCallback} */ cb) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', () => {});
    const el = /** @type {any} */ (await mount('<x-animated-number lang="en" value="0" duration="100"></x-animated-number>'));

    el.value = 100;
    await el.updateComplete;
    expect(text(el, '[part~="number"]')).toBe('0');
    expect(text(el, '.focsd-visually-hidden')).toBe('100');
    expect(frames.length).toBeGreaterThan(0);

    const start = performance.now();
    frames.shift()?.(start + 50);
    await el.updateComplete;
    const mid = Number(text(el, '[part~="number"]'));
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(100);

    frames.shift()?.(start + 1000);
    await el.updateComplete;
    expect(text(el, '[part~="number"]')).toBe('100');
  });

  it('a first render without `from` shows the value at once; with `from` it counts from there', async () => {
    stubMotion(false);
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', () => {});
    const plain = await mount('<x-animated-number lang="en" value="42"></x-animated-number>');
    expect(text(plain, '[part~="number"]')).toBe('42');

    const counted = await mount('<x-animated-number lang="en" value="42" from="0" duration="100"></x-animated-number>');
    expect(text(counted, '[part~="number"]')).toBe('0');
    expect(text(counted, '.focsd-visually-hidden')).toBe('42');
  });
});

describe('animated number: edge cases', () => {
  it('a new value mid-count starts from the number on screen, not from the previous end', async () => {
    stubMotion(false);
    /** @type {FrameRequestCallback[]} */
    const frames = [];
    vi.stubGlobal('requestAnimationFrame', (/** @type {FrameRequestCallback} */ cb) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', () => {});
    const el = /** @type {any} */ (await mount('<x-animated-number lang="en" value="0" duration="100"></x-animated-number>'));

    el.value = 100;
    await el.updateComplete;
    frames.shift()?.(performance.now() + 50);
    await el.updateComplete;
    const shown = Number(text(el, '[part~="number"]'));
    expect(shown).toBeGreaterThan(0);

    el.value = 500;
    await el.updateComplete;
    // Before any frame of the second count the text has not jumped back to 100 (or 0).
    expect(Number(text(el, '[part~="number"]'))).toBe(shown);
    expect(text(el, '.focsd-visually-hidden')).toBe('500');
  });

  it('warns once about a value that is not a number, and shows 0', async () => {
    stubMotion(false);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = await mount('<x-animated-number lang="en" value="abc"></x-animated-number>');

    expect(text(el, '[part~="number"]')).toBe('0');
    expect(warn.mock.calls.filter(([m]) => String(m).includes('not a number'))).toHaveLength(1);
    warn.mockRestore();
  });
});

describe('stat', () => {
  it('says "No change" when the change rounds to nothing, and ignores an empty delta', async () => {
    stubMotion(false);
    const tiny = await mount('<x-stat lang="en" label="Revenue" value="3" delta="0.0001"></x-stat>');
    expect(text(tiny, '[part~="delta"]')).toBe('No change from last period');
    expect(tiny.shadowRoot.querySelector('[part~="delta"]')?.getAttribute('data-judgement')).toBe('neutral');

    const blank = await mount('<x-stat lang="en" label="Revenue" value="3" delta=""></x-stat>');
    expect(blank.shadowRoot.querySelector('[part~="delta"]')).toBeNull();

    const zero = await mount('<x-stat lang="en" label="Revenue" value="3" delta="0"></x-stat>');
    expect(text(zero, '[part~="delta"]')).toBe('No change from last period');
  });

  it('is a group named by its label, with the delta in words', async () => {
    stubMotion(false);

    const el = await mount(
      '<x-stat lang="en" label="Revenue" value="48200" format=\'{"style":"currency","currency":"USD","maximumFractionDigits":0}\' delta="0.12"></x-stat>',
    );

    const group = el.shadowRoot.querySelector('[role="group"]');
    const labelId = group?.getAttribute('aria-labelledby') ?? '';

    expect(el.shadowRoot.getElementById(labelId)?.textContent?.trim()).toBe('Revenue');
    expect(text(el, '[part~="value"]')).toBe('$48,200');
    expect(text(el, '[part~="delta"]')).toBe('Up 12% from last period, good');
    expect(el.shadowRoot.querySelector('[part~="delta"]')?.getAttribute('data-judgement')).toBe('good');
    expect(el.shadowRoot.querySelector('[part~="delta-icon"]')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('good="down" turns a rise into bad news', async () => {
    stubMotion(false);
    const el = await mount('<x-stat lang="en" label="Churn" value="3" delta="0.4" good="down" period="last month"></x-stat>');

    expect(text(el, '[part~="delta"]')).toBe('Up 40% from last month, bad');
    expect(el.shadowRoot.querySelector('[part~="delta"]')?.getAttribute('data-judgement')).toBe('bad');
  });

  it('with href the label is a link; without delta there is no delta part', async () => {
    stubMotion(false);
    const el = await mount('<x-stat lang="en" label="Orders" value="1200" href="/orders"></x-stat>');

    expect(el.shadowRoot.querySelector('[part~="label"] a')?.getAttribute('href')).toBe('/orders');
    expect(el.shadowRoot.querySelector('[part~="delta"]')).toBeNull();
  });

  it('shows text that is not a number as it is', async () => {
    stubMotion(false);
    const el = await mount('<x-stat lang="en" label="Uptime" value="All systems normal"></x-stat>');

    expect(text(el, '[part~="value"]')).toBe('All systems normal');
  });

  it('with animate the value is an animated number', async () => {
    stubMotion(false);
    const el = await mount('<x-stat lang="en" label="Visitors" value="980" animate></x-stat>');

    expect(el.shadowRoot.querySelector('[part~="value"] x-animated-number')).not.toBeNull();
  });
});

describe('status dot', () => {
  it('is an image named by its label, defaulting to the status name', async () => {
    const el = await mount('<x-status-dot lang="en" status="busy"></x-status-dot>');
    const img = el.shadowRoot.querySelector('[role="img"]');

    expect(img?.getAttribute('aria-label')).toBe('Busy');
    expect(el.shadowRoot.querySelector('[part~="label"]')).toBeNull();
  });

  it('label-visible shows the label beside the dot', async () => {
    const el = await mount('<x-status-dot lang="en" status="online" label="Ada is online" label-visible></x-status-dot>');

    // The name holds the visible text (WCAG 2.5.3) and still says the status.
    expect(el.shadowRoot.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Ada is online, Online');
    expect(text(el, '[part~="label"]')).toBe('Ada is online');
  });

  it('a custom label keeps the status in the name; a label that is the status term does not repeat it', async () => {
    const custom = await mount('<x-status-dot lang="en" status="error" label="Server 3"></x-status-dot>');
    expect(custom.shadowRoot.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Server 3, Error');

    const same = await mount('<x-status-dot lang="en" status="error" label="Error"></x-status-dot>');
    expect(same.shadowRoot.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Error');
  });

  it("joins the label and the status with the language's own separator", async () => {
    registerTranslation({ $code: 'zz', $name: 'Test', statusError: 'Failure', listSeparator: ' / ' });
    const el = await mount('<x-status-dot lang="zz" status="error" label="Server 3"></x-status-dot>');

    expect(el.shadowRoot.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Server 3 / Failure');
  });

  it('draws a different shape for every status, and an unknown status as neutral', async () => {
    const glyphs = Object.values(STATUS_GLYPHS);
    expect(new Set(glyphs).size).toBe(glyphs.length);

    const el = await mount('<x-status-dot lang="en" status="sideways"></x-status-dot>');
    expect(el.shadowRoot.querySelector('[part~="dot"] path')?.getAttribute('d')).toBe(STATUS_GLYPHS.neutral);
    expect(el.shadowRoot.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Unknown');
  });
});
