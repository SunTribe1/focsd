/**
 * The app's link handler (`setLinkHandler`, in `@focsd/primitives/utils`): hands plain clicks on
 * same-origin links to a client-side router. Links stay real `<a href>` elements; anything the
 * browser does specially (new tab, download, modifier keys, other origins, in-page hashes) stays native.
 */

/**
 * @callback LinkHandler
 * @param {URL} url A fresh, absolute, same-origin http(s) URL; changing it changes nothing else.
 * @param {{ element: Element, event: MouseEvent }} context The Focsd element and the click.
 * @returns {boolean | Promise<boolean>} `true` when the app navigated, so the click's default is prevented.
 *   A promise prevents it at once; unless it resolves to `true`, the page is then loaded as a normal link.
 */

/** @type {LinkHandler | null} */
let handler = null;

/** Clicks already offered to the handler (a footer section and a link inside it both see one click). */
const seen = new WeakSet();

/**
 * Set the app's link handler, or remove it with `null`.
 * @param {LinkHandler | null} fn
 */
export function setLinkHandler(fn) {
  handler = fn;
}

/**
 * The first `<a href>` the click went through below `host` (its shadow root or its slotted light DOM).
 * @param {Event} event
 * @param {Element} host
 * @returns {HTMLAnchorElement | undefined}
 */
function anchorOf(event, host) {
  for (const node of event.composedPath()) {
    if (node === host) return undefined;

    if (/** @type {Element} */ (node).localName === 'a' && /** @type {Element} */ (node).hasAttribute('href'))
      return /** @type {HTMLAnchorElement} */ (node);
  }

  return undefined;
}

/**
 * The URL to hand over, or null when the browser should follow the link itself.
 * @param {HTMLAnchorElement} a
 * @returns {URL | null}
 */
function routable(a) {
  // The link's own target, else the page's `<base target>`; a ping or download is the browser's job.
  const target = a.getAttribute('target') ?? document.querySelector('base[target]')?.getAttribute('target') ?? '';

  if (!/^(_self)?$/i.test(target) || a.hasAttribute('download') || a.hasAttribute('ping')) return null;
  const here = location.href;
  // `a.href` is already absolute; an href the browser cannot parse stays native.
  const url = URL.parse(a.href);

  // Same origin over http(s) only, so a handler never sees javascript:, data:, blob: or another site.
  // A path starting with `//` or a URL with credentials would make a router's pushState throw and
  // fall back to a full load somewhere else. A link to this page with a `#` (even `href="#"`) scrolls natively.
  if (
    !url ||
    !/^https?:$/.test(url.protocol) ||
    url.origin !== location.origin ||
    url.pathname.startsWith('//') ||
    url.username ||
    url.password ||
    (url.href.includes('#') && url.href.split('#')[0] === here.split('#')[0])
  )
    return null;

  return url;
}

/**
 * Offer a click inside `host` to the link handler; called from each link-like base's click listener.
 * @param {MouseEvent} event
 * @param {Element} host
 */
export function routeClick(event, host) {
  if (!handler || event.defaultPrevented || seen.has(event)) return;

  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const a = anchorOf(event, host);
  const url = a && routable(a);

  if (!url) return;
  seen.add(event);

  // A handler that throws never reaches preventDefault, so the browser still follows the link.
  const result = /** @type {unknown} */ (handler(url, { element: host, event }));

  // An async handler: the router owns the click now; if it does not settle to `true`, load the page once.
  if (result instanceof Promise) {
    event.preventDefault();
    result.then(
      (ok) => ok === true || location.assign(url.href),
      () => location.assign(url.href),
    );
  } else if (result === true) event.preventDefault();
}

/**
 * Wire a host's clicks to the link handler (one listener on the host covers its shadow and slotted links).
 * @param {HTMLElement} host
 */
export function routeLinks(host) {
  host.addEventListener('click', (event) => routeClick(/** @type {MouseEvent} */ (event), host));
}
