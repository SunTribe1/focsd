import { finish, SVG_NS } from './icon-svg.js';
import { isSvgDocument, sanitizeSvg } from './svg-sanitize.js';

/**
 * Untrusted icon sources: markup, SVG elements and URLs handed over by registered icon libraries,
 * `setSystemIcons` overrides and `<focsd-icon src>`. Everything here is sanitized. The icon
 * registry (icons.js) loads this module lazily, the first time it meets such a source (and as soon
 * as a library is registered), so system icons never carry the sanitizer (quality B11).
 *
 * @typedef {import('./icon-svg.js').IconMutate} IconMutate
 * @typedef {SVGElement | null | Promise<SVGElement | null>} IconResult
 * @typedef {{ createHTML: (markup: string) => string }} HtmlPolicy
 * @typedef {{ trustedTypes?: { createPolicy: (name: string, rules: { createHTML: (s: string) => string }) => HtmlPolicy } }} TrustedTypesScope
 */

/** @type {Map<string, Promise<string>>} */
const fetched = new Map();

/** URLs whose fetch failed: kept in `fetched` (no refetch per render) until the registry changes. */
/** @type {Set<string>} */
const failedUrls = new Set();

/** The registry changed: failed URLs may be fetched again. */
export function forgetFailedUrls() {
  for (const url of failedUrls) fetched.delete(url);
  failedUrls.clear();
}

/** Trusted Types: markup goes into an inert <template> and is sanitized before use. */
/** @type {HtmlPolicy | null | undefined} */
let policy;

/** @param {string} markup */
const trusted = (markup) => {
  if (policy === undefined) {
    try {
      const scope = /** @type {TrustedTypesScope} */ (globalThis);
      policy = scope.trustedTypes?.createPolicy('focsd-icons', { createHTML: (s) => s }) ?? null;
    } catch {
      policy = null; // The page's CSP does not allow this policy name; fall back to plain strings.
    }
  }

  return policy ? policy.createHTML(markup) : markup;
};

/** @param {string} markup */
function parse(markup) {
  // The HTML parser (inside an inert <template>: nothing runs, nothing loads) accepts what icon
  // sets ship and what people paste: with or without xmlns, HTML-style boolean attributes.
  const template = document.createElement('template');
  template.innerHTML = trusted(markup);
  const root = template.content.querySelector('svg');

  return root ? document.importNode(sanitizeSvg(root), true) : null;
}

/**
 * @param {string} url
 * @param {IconMutate} [mutate]
 * @returns {IconResult}
 */
export function fromUrl(url, mutate) {
  if (url.includes('#')) {
    const el = document.createElementNS(SVG_NS, 'svg');
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', url);
    el.append(use);

    return finish(el, mutate);
  }

  if (!fetched.has(url)) {
    const request = fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`"${url}" answered HTTP ${r.status}`))))
      // A server's HTML fallback page (status 200) is a missing icon too.
      .then((text) => (isSvgDocument(text) ? text : Promise.reject(new Error(`"${url}" is not an SVG file`))));

    // Kept as failed (no refetch on every render or for another name) until the registry changes;
    // each icon that uses it warns once, through the registry's cache.
    request.catch(() => failedUrls.add(url));
    fetched.set(url, request);
  }

  const pending = /** @type {Promise<string>} */ (fetched.get(url));

  return pending.then((text) => finish(parse(text), mutate));
}

/**
 * Turn a resolved (not pending, not empty) source into an SVGElement template, null, or a Promise
 * of one.
 * @param {unknown} source
 * @param {IconMutate} [mutate]
 * @returns {IconResult}
 */
export function toIcon(source, mutate) {
  if (typeof SVGElement !== 'undefined' && source instanceof SVGElement) {
    // Only an <svg> root is an icon (a resolver could hand back a <script> element).
    return source.localName === 'svg' ? finish(sanitizeSvg(/** @type {SVGElement} */ (source.cloneNode(true))), mutate) : null;
  }

  if (typeof source !== 'string') return null;

  return source.trimStart().startsWith('<') ? finish(parse(source), mutate) : fromUrl(source, mutate);
}
