// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLocale, resolveLocale, setLocale } from '../src/internal/locale.js';
import { LocalizeController } from '../src/internal/localize.js';
import { formatNumber } from '../src/internal/format-number.js';
import { FocsdFormatNumberBase } from '../src/display/format-number-base.js';
import { FocsdRelativeTimeBase } from '../src/display/relative-time-base.js';

customElements.define('x-format-number', FocsdFormatNumberBase);

customElements.define('x-relative-time', FocsdRelativeTimeBase);

/** A minimal controller host: an element that counts update requests. */
class Host extends HTMLElement {
  /** @type {import('lit').ReactiveController[]} */
  controllers = [];

  requestUpdate = vi.fn();

  /** @param {import('lit').ReactiveController} controller */
  addController(controller) {
    this.controllers.push(controller);
  }
}

customElements.define('x-locale-host', Host);

/** A connected host and its controller. */
function host(/** @type {Element} */ parent = document.body) {
  const el = /** @type {Host} */ (document.createElement('x-locale-host'));

  parent.append(el);
  const controller = new LocalizeController(/** @type {any} */ (el));

  el.controllers.forEach((c) => c.hostConnected?.());

  return { el, controller };
}

afterEach(() => {
  setLocale(null);
  document.documentElement.removeAttribute('lang');
  document.body.replaceChildren();
});

describe('setLocale and getLocale (R3)', () => {
  it('starts unset, stores a canonical tag, and null resets it', () => {
    expect(getLocale()).toBe(null);
    setLocale('de-ch');
    expect(getLocale()).toBe('de-CH');
    setLocale(null);
    expect(getLocale()).toBe(null);
  });

  it('rejects a tag Intl cannot read, and keeps the previous locale', () => {
    setLocale('fr');
    expect(() => setLocale('not a locale')).toThrow(RangeError);
    expect(() => setLocale(/** @type {any} */ (42))).toThrow(TypeError);
    expect(() => setLocale('')).toThrow(RangeError);
    expect(getLocale()).toBe('fr');
  });
});

describe('resolveLocale: element locale, then setLocale(), then the nearest lang, then the runtime', () => {
  it('follows the precedence order one step at a time', () => {
    const section = document.createElement('section');
    const el = document.createElement('span');

    section.append(el);
    document.body.append(section);
    expect(resolveLocale(el, '')).toBe(undefined);
    document.documentElement.setAttribute('lang', 'es');
    expect(resolveLocale(el, '')).toBe('es');
    section.setAttribute('lang', 'fr');
    expect(resolveLocale(el, '')).toBe('fr');
    setLocale('de');
    expect(resolveLocale(el, '')).toBe('de');
    expect(resolveLocale(el, 'ja')).toBe('ja');
    setLocale(null);
    expect(resolveLocale(el, null)).toBe('fr');
  });

  it('crosses shadow roots to find the nearest lang', () => {
    const outer = document.createElement('div');
    const inner = document.createElement('span');

    outer.setAttribute('lang', 'pt');
    outer.attachShadow({ mode: 'open' }).append(inner);
    document.body.append(outer);
    expect(resolveLocale(inner)).toBe('pt');
  });

  it('works without an element', () => {
    expect(resolveLocale(null, 'it')).toBe('it');
    setLocale('nl');
    expect(resolveLocale(null)).toBe('nl');
  });

  it('the localize controller formats with the same precedence', () => {
    const section = document.createElement('section');

    section.setAttribute('lang', 'fr');
    document.body.append(section);
    const { controller } = host(section);

    expect(controller.locale()).toBe('fr');
    setLocale('de');
    expect(controller.locale()).toBe('de');
    // Terms keep the nearest lang: setLocale changes formatting only.
    expect(controller.lang()).toBe('fr');
  });

  it('formatNumber falls back to setLocale() when given no locale', () => {
    setLocale('de');
    expect(formatNumber(1234.5)).toBe(new Intl.NumberFormat('de').format(1234.5));
    expect(formatNumber(1234.5, { locale: 'en' })).toBe('1,234.5');
  });
});

describe('setLocale re-renders only the elements that format with the default locale', () => {
  it('re-renders a host that read locale(), not one that only uses terms', () => {
    const formats = host();
    const words = host();

    formats.controller.locale();
    words.controller.term('close');
    setLocale('de');
    expect(formats.el.requestUpdate).toHaveBeenCalledTimes(1);
    expect(words.el.requestUpdate).not.toHaveBeenCalled();
  });

  it('setting the same locale again re-renders nothing', () => {
    const formats = host();

    formats.controller.locale();
    setLocale('de');
    setLocale('de');
    expect(formats.el.requestUpdate).toHaveBeenCalledTimes(1);
  });

  it('a disconnected host is not re-rendered', () => {
    const formats = host();

    formats.controller.locale();
    formats.el.controllers.forEach((c) => c.hostDisconnected?.());
    setLocale('de');
    expect(formats.el.requestUpdate).not.toHaveBeenCalled();
  });

  it('focsd-format-number follows setLocale() unless it has its own locale', async () => {
    document.body.innerHTML =
      '<x-format-number value="1234.5"></x-format-number><x-format-number value="1234.5" locale="en"></x-format-number>';
    const [auto, own] = /** @type {any[]} */ ([...document.body.children]);

    await Promise.all([auto.updateComplete, own.updateComplete]);
    setLocale('de');
    await Promise.all([auto.updateComplete, own.updateComplete]);
    expect(auto.shadowRoot.textContent).toContain(new Intl.NumberFormat('de').format(1234.5));
    expect(own.shadowRoot.textContent).toContain('1,234.5');
  });

  it('focsd-relative-time re-renders in the default locale and marks its language', async () => {
    document.body.innerHTML = `<x-relative-time datetime="${new Date(Date.now() - 86_400_000).toISOString()}"></x-relative-time>`;
    const el = /** @type {any} */ (document.body.firstElementChild);

    await el.updateComplete;
    setLocale('de');
    await el.updateComplete;
    const time = el.shadowRoot.querySelector('time');

    expect(time.textContent).toContain(new Intl.RelativeTimeFormat('de', { numeric: 'auto' }).format(-1, 'day'));
    expect(time.getAttribute('lang')).toBe('de');
  });
});
