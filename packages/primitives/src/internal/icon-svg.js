/**
 * The SVG shape every icon gets, shared by the icon registry (icons.js) and the loader of untrusted
 * icon sources (icon-sources.js), so neither imports the other.
 * @typedef {(svg: SVGElement) => void} IconMutate
 */

export const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Size to 1em, keep the drawing's coordinate system, hide from assistive technology.
 * @param {SVGElement | null} el
 * @param {IconMutate} [mutate]
 * @returns {SVGElement | null}
 */
export function finish(el, mutate) {
  if (!el) return null;
  mutate?.(el);

  if (!el.hasAttribute('viewBox')) {
    // A missing attribute parses as NaN, as parseFloat(null) does.
    const w = Number.parseFloat(/** @type {string} */ (el.getAttribute('width')));
    const h = Number.parseFloat(/** @type {string} */ (el.getAttribute('height')));

    if (w > 0 && h > 0) el.setAttribute('viewBox', `0 0 ${w} ${h}`);
  }

  el.setAttribute('width', '1em');
  el.setAttribute('height', '1em');
  el.setAttribute('aria-hidden', 'true');
  el.setAttribute('focusable', 'false');

  return el;
}
