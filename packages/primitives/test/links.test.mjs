// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { routeClick, setLinkHandler } from '../src/internal/links.js';
import { FocsdLinkBase } from '../src/display/link-base.js';
import { FocsdNavItemBase } from '../src/nav/nav-item-base.js';
import { FocsdSidebarItemBase } from '../src/nav/sidebar-item-base.js';
import { FocsdBreadcrumbItemBase } from '../src/nav/breadcrumb-item-base.js';
import { FocsdFooterSectionBase } from '../src/nav/footer-section-base.js';
import { FocsdPaginationBase } from '../src/nav/pagination-base.js';
import { FocsdSkipLinkBase } from '../src/display/skip-link-base.js';

customElements.define('x-link', FocsdLinkBase);

customElements.define('x-nav-item', FocsdNavItemBase);

customElements.define('x-sidebar-item', FocsdSidebarItemBase);

customElements.define('x-breadcrumb-item', FocsdBreadcrumbItemBase);

customElements.define('x-footer-section', FocsdFooterSectionBase);

customElements.define('x-pagination', FocsdPaginationBase);

customElements.define('x-skip-link', FocsdSkipLinkBase);

/** A host element with a plain anchor inside, the shape every wired base has. */
function anchorIn(/** @type {Record<string, string>} */ attrs = {}) {
  const host = document.createElement('div');
  const a = document.createElement('a');

  for (const [name, value] of Object.entries({ href: '/docs/start', ...attrs })) a.setAttribute(name, value);
  host.append(a);
  document.body.append(host);

  return { host, a };
}

/** Dispatch a click at `target` (a window listener then stops happy-dom from following the link). */
function click(/** @type {Element} */ target, /** @type {MouseEventInit} */ init = {}) {
  const event = new MouseEvent('click', { bubbles: true, composed: true, cancelable: true, button: 0, ...init });

  target.dispatchEvent(event);

  return event;
}

/** Route a click at `a` through `routeClick` on `host`, as a base's listener does. */
function route(/** @type {{ host: Element, a: Element }} */ { host, a }, /** @type {MouseEventInit} */ init = {}) {
  let defaultPrevented = false;

  const listener = (/** @type {Event} */ event) => {
    routeClick(/** @type {MouseEvent} */ (event), host);
    defaultPrevented = event.defaultPrevented;
  };

  host.addEventListener('click', listener);
  const event = click(a, init);

  host.removeEventListener('click', listener);

  return { event, defaultPrevented };
}

/** Keeps happy-dom from following links (it navigates on click) after every other listener ran. */
const stopNavigation = (/** @type {Event} */ event) => event.preventDefault();
let handler = vi.fn(() => true);

beforeEach(() => {
  window.addEventListener('click', stopNavigation);
  handler = vi.fn(() => true);
  setLinkHandler(handler);
});

afterEach(() => {
  setLinkHandler(null);
  window.removeEventListener('click', stopNavigation);
  document.body.replaceChildren();
});

describe('routeClick (R2): the handler gets plain same-origin clicks', () => {
  it('passes a URL object, the element and the event, and prevents the default when it returns true', () => {
    const link = anchorIn({ href: '/docs/start?x=1#part' });
    const { event, defaultPrevented } = route(link);

    expect(handler).toHaveBeenCalledTimes(1);
    const [url, context] = handler.mock.calls[0];

    expect(Object.prototype.toString.call(url)).toBe('[object URL]');
    expect(url.href).toBe(new URL('/docs/start?x=1#part', location.href).href);
    expect(context.element).toBe(link.host);
    expect(context.event).toBe(event);
    expect(defaultPrevented).toBe(true);
  });

  it('hands over a fresh URL each time, so the handler cannot change the link', () => {
    const link = anchorIn();

    handler.mockImplementation((url) => {
      Object.assign(url, { pathname: '/elsewhere' });

      return true;
    });
    route(link);
    expect(link.a.getAttribute('href')).toBe('/docs/start');
  });

  it('leaves the default alone when the handler returns false or anything but true', () => {
    for (const result of [false, undefined, 'yes', 1]) {
      handler.mockReturnValueOnce(/** @type {any} */ (result));
      expect(route(anchorIn()).defaultPrevented).toBe(false);
    }
  });

  it('does nothing without a handler, and setLinkHandler(null) removes it', () => {
    setLinkHandler(null);
    expect(route(anchorIn()).defaultPrevented).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it('a handler that is not a function cannot break links: the click stays native', () => {
    setLinkHandler(/** @type {any} */ ('router'));
    const { host, a } = anchorIn();
    let defaultPrevented = true;

    a.addEventListener('click', (event) => {
      expect(() => routeClick(/** @type {MouseEvent} */ (event), host)).toThrow(TypeError);
      defaultPrevented = event.defaultPrevented;
    });
    click(a);
    expect(defaultPrevented).toBe(false);
  });
});

describe('routeClick (R2): clicks the browser handles itself stay native', () => {
  it.each([['metaKey'], ['ctrlKey'], ['shiftKey'], ['altKey']])('keeps %s+click native', (key) => {
    expect(route(anchorIn(), { [key]: true }).defaultPrevented).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it.each([[1], [2]])('keeps button %i (middle, secondary) native', (button) => {
    expect(route(anchorIn(), { button }).defaultPrevented).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it('keeps a click another listener already prevented', () => {
    const link = anchorIn();

    link.a.addEventListener('click', (event) => event.preventDefault());
    route(link);
    expect(handler).not.toHaveBeenCalled();
  });

  it.each([
    ['cross-origin', 'https://elsewhere.example/docs'],
    ['protocol-relative', '//elsewhere.example/docs'],
    ['javascript:', 'javascript:alert(1)'],
    ['data:', 'data:text/html,<script>alert(1)</script>'],
    ['mailto:', 'mailto:someone@example.com'],
    ['blob:', `blob:${location.origin}/1b4e28ba-2fa1-11d2-883f-0016d3cca427`],
  ])('keeps a %s link native', (_name, href) => {
    expect(route(anchorIn({ href })).defaultPrevented).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it.each([['_blank'], ['_parent'], ['_top'], ['frame-name']])('keeps target=%s native', (target) => {
    route(anchorIn({ target }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('routes target=_self like no target', () => {
    route(anchorIn({ target: '_SELF' }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('keeps download links native, with or without a file name', () => {
    route(anchorIn({ download: '' }));
    route(anchorIn({ download: 'report.pdf' }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('keeps a hash link to the same page native, but routes a hash link to another page', () => {
    route(anchorIn({ href: `${location.pathname}${location.search}#part` }));
    route(anchorIn({ href: '#part' }));
    expect(handler).not.toHaveBeenCalled();
    route(anchorIn({ href: '/other#part' }));
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('routeClick (R2): which link and how often', () => {
  it('ignores a click outside any link, an anchor without href, and an anchor around the host', () => {
    const outer = document.createElement('a');
    const host = document.createElement('div');
    const bare = document.createElement('a');

    outer.href = '/around';
    host.append(bare);
    outer.append(host);
    document.body.append(outer);
    route({ host, a: bare });
    route({ host, a: host });
    expect(handler).not.toHaveBeenCalled();
  });

  it('hands one click to the handler once, however many hosts route it', () => {
    const link = anchorIn();
    const outer = document.createElement('div');

    outer.append(link.host);
    document.body.append(outer);
    handler.mockReturnValue(false);
    outer.addEventListener('click', (event) => routeClick(/** @type {MouseEvent} */ (event), outer));
    route(link);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('lets a handler that throws fall back to native navigation', () => {
    const { host, a } = anchorIn();
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });

    handler.mockImplementation(() => {
      throw new Error('router down');
    });
    // The listener's error reaches the page's error reporting; the default (navigation) stays.
    let defaultPrevented = true;

    a.addEventListener('click', () => {
      expect(() => routeClick(event, host)).toThrow('router down');
      defaultPrevented = event.defaultPrevented;
    });
    a.dispatchEvent(event);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(defaultPrevented).toBe(false);
  });
});

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

describe('the R2 bases hand their link clicks to the handler', () => {
  it.each([
    ['link', '<x-link href="/a">A</x-link>'],
    ['nav item', '<x-nav-item href="/a">A</x-nav-item>'],
    ['sidebar item', '<x-sidebar-item href="/a">A</x-sidebar-item>'],
    ['breadcrumb item', '<x-breadcrumb-item href="/a">A</x-breadcrumb-item>'],
    ['pagination (href)', '<x-pagination total="3" page="1" href="/a?page={page}"></x-pagination>'],
  ])('%s: the shadow <a href> stays a real link and its click is routed', async (_name, markup) => {
    const el = await mount(markup);
    const a = /** @type {HTMLAnchorElement} */ (el.shadowRoot.querySelector('a[href]'));

    expect(a.localName).toBe('a');
    click(a);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][1].element).toBe(el);
  });

  it('footer section: a slotted light-DOM link is routed', async () => {
    const el = await mount('<x-footer-section heading="Docs"><a href="/a">A</a></x-footer-section>');

    click(/** @type {Element} */ (el.querySelector('a')));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('a link with target=_blank or external keeps its native new tab', async () => {
    const el = await mount('<x-link href="/a" external>A</x-link>');

    click(/** @type {Element} */ (el.shadowRoot.querySelector('a')));
    expect(handler).not.toHaveBeenCalled();
  });

  it('pagination with buttons fires focsd-page-change and never calls the handler', async () => {
    const el = await mount('<x-pagination total="3" page="1"></x-pagination>');

    click(/** @type {Element} */ (el.shadowRoot.querySelector('button[part="next"]')));
    expect(handler).not.toHaveBeenCalled();
  });

  it('the skip link (an in-page link) is not handed over', async () => {
    const el = await mount('<x-skip-link href="/elsewhere">Skip</x-skip-link>');
    const a = el.shadowRoot.querySelector('a');

    if (a) click(a);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('routeClick (wave 20 fixes): more clicks stay native', () => {
  it.each([
    ['a same-origin path that starts with //', () => `${location.origin}//evil.test/x`],
    ['a same-origin path that starts with /// ', () => `${location.origin}///evil.test/x`],
    ['a backslash path', () => '/\\evil.test/x'],
    ['a dot segment before //', () => `${location.origin}/.//evil.test/x`],
    ['userinfo', () => `${location.protocol}//u:p@${location.host}/a`],
    ['a user name only', () => `${location.protocol}//u@${location.host}/a`],
  ])('keeps %s native (I1, minor 15)', (_name, href) => {
    expect(route(anchorIn({ href: href() })).defaultPrevented).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it.each([['#'], ['#top'], ['?q=1#']])('keeps href="%s" to the current page native (I2)', (href) => {
    history.replaceState(null, '', `${location.pathname.split('?')[0]}${href.startsWith('?') ? '?q=1' : ''}`);
    route(anchorIn({ href }));
    expect(handler).not.toHaveBeenCalled();
    history.replaceState(null, '', location.pathname);
  });

  it('routes a link to this page without a fragment marker (a reload by the router)', () => {
    route(anchorIn({ href: location.pathname + location.search }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('honours <base target>: anything but _self stays native (I3)', () => {
    const base = document.createElement('base');

    base.setAttribute('target', '_blank');
    document.head.append(base);

    try {
      route(anchorIn());
      expect(handler).not.toHaveBeenCalled();
      // The link's own target wins over the base.
      route(anchorIn({ target: '_self' }));
      expect(handler).toHaveBeenCalledTimes(1);
      base.setAttribute('target', '_SELF');
      route(anchorIn());
      expect(handler).toHaveBeenCalledTimes(2);
    } finally {
      base.remove();
    }
  });

  it('keeps a link with ping native (minor 16)', () => {
    route(anchorIn({ ping: '/track' }));
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('routeClick (minor 16): an async handler navigates once', () => {
  it('prevents the default at once when the handler returns a promise, and does not navigate again on true', async () => {
    const assign = vi.spyOn(location, 'assign').mockImplementation(() => {});

    try {
      handler.mockImplementation(() => /** @type {any} */ (Promise.resolve(true)));
      expect(route(anchorIn()).defaultPrevented).toBe(true);
      await new Promise((r) => setTimeout(r));
      expect(assign).not.toHaveBeenCalled();
    } finally {
      assign.mockRestore();
    }
  });

  it.each([
    ['false', () => Promise.resolve(false)],
    ['a rejection', () => Promise.reject(new Error('router down'))],
  ])('loads the page itself once when the promise settles to %s', async (_name, result) => {
    const assign = vi.spyOn(location, 'assign').mockImplementation(() => {});

    try {
      handler.mockImplementation(/** @type {any} */ (result));
      expect(route(anchorIn({ href: '/docs/x?y=1' })).defaultPrevented).toBe(true);
      await new Promise((r) => setTimeout(r));
      expect(assign).toHaveBeenCalledTimes(1);
      expect(assign).toHaveBeenCalledWith(new URL('/docs/x?y=1', location.href).href);
    } finally {
      assign.mockRestore();
    }
  });
});

describe('router recipes (I1): a router-like stub never leaves the site', () => {
  /**
   * A router stub: like history.pushState-based routers, it resolves the path against the page and,
   * when pushState would refuse it, falls back to a full load of the resolved address.
   */
  function stubRouter() {
    /** @type {string[]} */
    const loads = [];

    return {
      loads,
      navigate(/** @type {string} */ path) {
        const dest = new URL(path, location.href);

        if (dest.origin !== location.origin) loads.push(dest.href);
      },
    };
  }

  // The recipe from foundations/utilities.mdx.
  const recipe = (/** @type {{ navigate: (p: string) => void }} */ router) => (/** @type {URL} */ url) => {
    router.navigate(`/${url.pathname.replace(/^\/+/, '')}${url.search}${url.hash}`);

    return true;
  };

  it.each([
    [() => `${location.origin}//evil.test/x`],
    [() => `${location.origin}/\\evil.test/x`],
    [() => `${location.origin}/.//evil.test/x`],
    [() => '/docs/start'],
  ])('href %#', (href) => {
    const router = stubRouter();

    setLinkHandler(recipe(router));
    route(anchorIn({ href: href() }));
    expect(router.loads).toEqual([]);
  });

  it('the recipe itself strips leading slashes from a // path', () => {
    const router = stubRouter();

    recipe(router)(new URL(`${location.origin}//evil.test/x`));
    expect(router.loads).toEqual([]);
  });

  it('without stripping, the same stub would leave the site (the recipe is what prevents it)', () => {
    const router = stubRouter();
    const url = new URL(`${location.origin}//evil.test/x`);

    router.navigate(url.pathname + url.search + url.hash);
    expect(router.loads).toEqual(['http://evil.test/x'.replace('http:', location.protocol)]);
  });
});
