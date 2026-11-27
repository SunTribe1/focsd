// @vitest-environment happy-dom
// Wave 21a: the bottom navigation bar and its items.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FocsdBottomNavBase } from '../src/nav/bottom-nav-base.js';
import { FocsdBottomNavItemBase } from '../src/nav/bottom-nav-item-base.js';
import { setLinkHandler } from '../src/internal/links.js';

customElements.define('x-bottom-nav', FocsdBottomNavBase);

customElements.define('x-bottom-nav-item', FocsdBottomNavItemBase);

/** @type {((matches: boolean) => void)[]} */
let mediaListeners = [];
let wide = false;

/** A matchMedia whose min-width queries match while `wide` is true. */
function stubMedia() {
  mediaListeners = [];
  vi.stubGlobal('matchMedia', (/** @type {string} */ query) => ({
    media: query,
    get matches() {
      return wide && query.includes('min-width');
    },
    addEventListener: (/** @type {string} */ _type, /** @type {() => void} */ fn) => mediaListeners.push(() => fn()),
    removeEventListener() {},
  }));
}

/** @param {boolean} value */
const setWide = (value) => {
  wide = value;
  mediaListeners.forEach((fn) => fn(value));
};

const ITEMS = `<x-bottom-nav-item href="/home" icon="star" label="Home" current></x-bottom-nav-item>
  <x-bottom-nav-item href="/search" icon="search" label="Search"></x-bottom-nav-item>
  <x-bottom-nav-item href="/inbox" icon="menu" label="Inbox" badge="3"></x-bottom-nav-item>`;

/**
 * @param {string} markup
 * @returns {Promise<FocsdBottomNavBase & { shadowRoot: ShadowRoot }>}
 */
async function mount(markup = `<x-bottom-nav>${ITEMS}</x-bottom-nav>`) {
  stubMedia();
  document.body.innerHTML = markup;
  const el = /** @type {any} */ (document.body.firstElementChild);

  await el.updateComplete;
  await Promise.all(el.items.map((/** @type {any} */ i) => i.updateComplete));

  return el;
}

/** @param {Element} item */
const linkOf = (item) => /** @type {HTMLAnchorElement} */ (item.shadowRoot?.querySelector('a[part~="link"]'));

afterEach(() => {
  setLinkHandler(null);
  wide = false;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe('bottom nav', () => {
  it('is a nav landmark named "Main" by default, with a list of items', async () => {
    const el = await mount();
    const nav = el.shadowRoot.querySelector('nav[part~="nav"]');

    expect(nav?.getAttribute('aria-label')).toBe('Main');
    expect(nav?.querySelector('ul[part~="list"] slot')).not.toBeNull();
    expect(el.items.map((i) => i.getAttribute('role'))).toEqual(['listitem', 'listitem', 'listitem']);
  });

  it('takes its name from label', async () => {
    const el = await mount(`<x-bottom-nav label="Sections">${ITEMS}</x-bottom-nav>`);

    expect(el.shadowRoot.querySelector('nav')?.getAttribute('aria-label')).toBe('Sections');
  });

  it('defaults to position fixed and reflects it', async () => {
    const el = await mount();

    expect(el.getAttribute('position')).toBe('fixed');
  });

  it('warns once when it has fewer than 3 or more than 5 items', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await mount('<x-bottom-nav><x-bottom-nav-item href="/a" label="A"></x-bottom-nav-item></x-bottom-nav>');
    await new Promise((resolve) => setTimeout(resolve));

    expect(warn.mock.calls.some(([m]) => String(m).includes('3 to 5 items'))).toBe(true);
  });

  it('does not warn with 3 items', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await mount();
    await new Promise((resolve) => setTimeout(resolve));

    expect(warn.mock.calls.some(([m]) => String(m).includes('3 to 5 items'))).toBe(false);
  });

  it('hides above hide-above (768 px by default), and hide-above="0" never hides', async () => {
    const el = await mount();

    expect(el.hasAttribute('data-wide')).toBe(false);
    setWide(true);
    await el.updateComplete;
    expect(el.hasAttribute('data-wide')).toBe(true);
    setWide(false);
    await el.updateComplete;
    expect(el.hasAttribute('data-wide')).toBe(false);

    const never = await mount(`<x-bottom-nav hide-above="0">${ITEMS}</x-bottom-nav>`);

    setWide(true);
    await never.updateComplete;
    expect(never.hasAttribute('data-wide')).toBe(false);
  });
});

describe('bottom nav: hideAbove as a property', () => {
  it('reflects the default and every change to the hide-above attribute', async () => {
    const el = await mount();

    expect(el.getAttribute('hide-above')).toBe('768');
    el.hideAbove = 0;
    await el.updateComplete;
    expect(el.getAttribute('hide-above')).toBe('0');
    el.hideAbove = 1024;
    await el.updateComplete;
    expect(el.getAttribute('hide-above')).toBe('1024');
  });

  it('follows a property set after the first render: 0 never hides, another width hides from there', async () => {
    const el = await mount();

    el.hideAbove = 0;
    await el.updateComplete;
    setWide(true);
    await el.updateComplete;
    expect(el.hasAttribute('data-wide')).toBe(false);

    el.hideAbove = 1024;
    await el.updateComplete;
    setWide(true);
    await el.updateComplete;
    expect(el.hasAttribute('data-wide')).toBe(true);
  });

  it('keeps the bar when the property is set to 0 before the first render', async () => {
    stubMedia();
    document.body.innerHTML = `<x-bottom-nav>${ITEMS}</x-bottom-nav>`;
    const el = /** @type {any} */ (document.body.firstElementChild);
    el.hideAbove = 0;
    await el.updateComplete;
    setWide(true);
    await el.updateComplete;

    expect(el.getAttribute('hide-above')).toBe('0');
    expect(el.hasAttribute('data-wide')).toBe(false);
  });
});

describe('bottom nav item', () => {
  it('is a real link with an icon and a visible label', async () => {
    const el = await mount();
    const link = linkOf(el.items[1]);

    expect(link.getAttribute('href')).toBe('/search');
    expect(link.querySelector('[part~="icon"]')?.getAttribute('aria-hidden')).toBe('true');
    expect(link.querySelector('[part~="label"]')?.textContent?.trim()).toBe('Search');
    expect(link.hasAttribute('aria-label')).toBe(false);
  });

  it('marks the current item aria-current="page", and only it', async () => {
    const el = await mount();

    expect(el.items.map((i) => linkOf(i).getAttribute('aria-current'))).toEqual(['page', null, null]);
  });

  it('adds the badge to the link name, and hides the visual badge from screen readers', async () => {
    const el = await mount();
    const link = linkOf(el.items[2]);

    expect(link.getAttribute('aria-label')).toBe('Inbox, 3 new');
    expect(link.querySelector('[part~="badge"]')?.getAttribute('aria-hidden')).toBe('true');
    expect(link.querySelector('[part~="badge"]')?.textContent?.trim()).toBe('3');
  });

  it('uses the slotted text as the label when label is unset', async () => {
    const el = await mount('<x-bottom-nav><x-bottom-nav-item href="/a" badge="2">Alerts</x-bottom-nav-item></x-bottom-nav>');

    expect(linkOf(el.items[0]).getAttribute('aria-label')).toBe('Alerts, 2 new');
  });

  it('hands plain clicks to the app link handler', async () => {
    const el = await mount();
    const handler = vi.fn(() => true);

    setLinkHandler(handler);
    const event = new MouseEvent('click', { bubbles: true, composed: true, cancelable: true, button: 0 });

    linkOf(el.items[1]).dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(/** @type {any} */ (handler.mock.calls[0])[0].pathname).toBe('/search');
    expect(event.defaultPrevented).toBe(true);
  });
});
