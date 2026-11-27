// cspell:words viewbox pathlength gradientunits gradienttransform patternunits patterncontentunits patterntransform maskunits maskcontentunits clippathunits markerwidth markerheight refx refy textlength
import { uid } from './id.js';

/** The SVG elements an icon may contain (lower-cased); anything else is removed with its content. */
const ELEMENTS = new Set(
  `
  svg g defs symbol use title desc path circle ellipse line polyline polygon rect text tspan
  lineargradient radialgradient stop clippath mask pattern marker
`
    .trim()
    .split(/\s+/),
);

/** Elements replaced by their content: a link's drawing stays, the link goes. */
const UNWRAP = new Set(['a', 'switch']);

/** Drawing attributes an icon may keep (lower-cased local names); anything else is removed. */
const ATTRIBUTES = new Set(
  `
  viewbox width height preserveaspectratio xmlns version id href d x y x1 y1 x2 y2 cx cy r rx
  ry fx fy fr points pathlength transform fill fill-rule fill-opacity stroke stroke-width
  stroke-linecap stroke-linejoin stroke-miterlimit stroke-dasharray stroke-dashoffset
  stroke-opacity opacity color vector-effect paint-order shape-rendering visibility display
  clip-rule clip-path mask marker-start marker-mid marker-end offset stop-color stop-opacity
  gradientunits gradienttransform spreadmethod patternunits patterncontentunits
  patterntransform maskunits maskcontentunits clippathunits markerwidth markerheight
  markerunits refx refy orient text-anchor dominant-baseline font-family font-size font-weight
  font-style letter-spacing dx dy textlength lengthadjust
`
    .trim()
    .split(/\s+/),
);

/** On the root these would move or scale the drawing out of its 1em box. */
const ROOT_ONLY_REMOVED = new Set(['transform', 'x', 'y']);

/** Elements whose `href` may point at a #fragment in the same icon. */
const HREF_ELEMENTS = new Set(['use', 'lineargradient', 'radialgradient', 'pattern']);

/** Functions a value may use: a same-icon `url(#id)`, color functions and transform functions. */
const SAFE_FUNCTION =
  /\b(?:url\(\s*#[\w.:-]+\s*\)|(?:rgba?|hsla?)\([\d\s.,%/+-]*\)|(?:matrix|translate|scale|rotate|skewX|skewY)\([\d\s.,eE+-]*\))/g;

/**
 * True when a value could reach outside the icon: a CSS escape (`\75rl(`), or any function other
 * than the safe ones (`url(http…)`, `image-set(…)`, `var(…)`…). The raw text is never searched
 * for `url(`, which escapes defeat.
 * @param {string} value
 */
const unsafeValue = (value) => value.includes('\\') || value.replaceAll(SAFE_FUNCTION, '').includes('(');

/**
 * @param {Element} el
 * @param {boolean} isRoot
 * @param {Attr} attr
 */
function keepAttribute(el, isRoot, attr) {
  const name = attr.localName.toLowerCase();

  // data-* attributes are inert hooks for the author's own styles or scripts.
  const known = ATTRIBUTES.has(name) || name.startsWith('data-');

  if (!known || (isRoot && ROOT_ONLY_REMOVED.has(name)) || unsafeValue(attr.value)) return false;

  if (name === 'href') return HREF_ELEMENTS.has(el.localName.toLowerCase()) && attr.value.trim().startsWith('#');

  return true;
}

/**
 * Give every id a per-icon prefix and rewrite the `#id` references to match, so an icon's ids
 * cannot collide with the ids the surrounding shadow root uses for aria-labelledby and similar.
 * @param {Element} root
 */
function prefixIds(root) {
  const prefix = uid('focsd-icon');
  const ids = new Set([...root.querySelectorAll('[id]')].map((el) => el.id));

  if (!ids.size) return;
  /** @param {string} id */
  const renamed = (id) => (ids.has(id) ? `${prefix}-${id}` : id);

  for (const el of [root, ...root.querySelectorAll('*')]) {
    if (el.id) el.id = renamed(el.id);

    for (const attr of [...el.attributes]) {
      if (attr.localName.toLowerCase() === 'id') continue;

      const value = attr.value
        .replaceAll(/url\(\s*#([\w.:-]+)\s*\)/g, (_, id) => `url(#${renamed(id)})`)
        .replace(/^\s*#([\w.:-]+)\s*$/, (_, id) => `#${renamed(id)}`);

      if (value !== attr.value) el.setAttributeNS(attr.namespaceURI, attr.name, value);
    }
  }
}

/**
 * Keep only the drawing: allowed elements and attributes, with values that cannot load anything
 * (no external url(), image-set(), CSS escapes), `href` only as a #fragment on use and paint
 * servers, nothing that takes focus or styles from outside (tabindex, class, part, style), and no
 * root transform or offset that would draw outside the 1em box. Ids get a per-icon prefix.
 * @template {Element} T
 * @param {T} root
 * @returns {T}
 */
export function sanitizeSvg(root) {
  for (const el of [root, ...root.querySelectorAll('*')]) {
    const tag = el.localName.toLowerCase();

    if (el !== root && (UNWRAP.has(tag) || !ELEMENTS.has(tag))) {
      // Descendants are still in the list: an unwrapped link's drawing is checked next.
      if (UNWRAP.has(tag)) el.replaceWith(...el.childNodes);
      else el.remove();
      continue;
    }

    // A copy: removing attributes from the live list while walking it would skip the next one.
    for (const attr of [...el.attributes]) {
      if (!keepAttribute(el, el === root, attr)) el.removeAttributeNS(attr.namespaceURI, attr.localName);
    }
  }

  prefixIds(root);

  return root;
}

/**
 * True when fetched text is an SVG document: `<svg` is the first element, after any XML prolog,
 * doctype or comments (an HTML page with an inline svg logo is not).
 * @param {string} text
 */
export const isSvgDocument = (text) => /^\s*(?:(?:<\?xml[^>]*>|<!doctype[^>]*>|<!--[\s\S]*?-->)\s*)*<svg[\s>/]/i.test(text);
