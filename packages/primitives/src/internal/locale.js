/**
 * The app's default locale for formatting numbers and dates (`setLocale`, in `@focsd-dev/primitives/utils`).
 * Terms keep following the nearest `lang`; this changes formatting only.
 */

/** @type {string | null} */
let current = null;

/** @type {Set<() => void>} */
const listeners = new Set();

/**
 * The nearest value of an attribute on `el` or an ancestor, crossing shadow roots (null when none).
 * @param {Element} el
 * @param {string} name
 * @returns {string | null}
 */
export function nearest(el, name) {
  for (let node = /** @type {Node | null} */ (el); node; node = node.parentNode ?? /** @type {ShadowRoot} */ (node).host) {
    if (node.nodeType === 1 && /** @type {Element} */ (node).hasAttribute(name)) return /** @type {Element} */ (node).getAttribute(name);
  }

  return null;
}

/**
 * Set the default locale for formatting, or go back to the page's `lang` with `null`.
 * Elements that format with it re-render. Throws a RangeError for a tag `Intl` cannot read, a TypeError for a non-string.
 * @param {string | null} locale A BCP 47 tag such as `de-CH`.
 */
export function setLocale(locale) {
  // In an array, a non-string throws a TypeError and an invalid or empty tag a RangeError.
  const next = locale === null ? null : (Intl.getCanonicalLocales([locale])[0] ?? null);

  if (next === current) return;
  current = next;

  for (const listener of listeners) listener();
}

/**
 * The default locale set with `setLocale()`, or null.
 * @returns {string | null}
 */
export const getLocale = () => current;

/**
 * Call `listener` after each change of the default locale.
 * @param {() => void} listener
 */
export const onLocaleChange = (listener) => {
  listeners.add(listener);
};

/**
 * The locale to format with: `explicit` (an element's `locale`), then `setLocale()`, then the nearest
 * `lang` of `el`, then undefined (the runtime's locale).
 * @param {Element | null | undefined} el
 * @param {string | null} [explicit]
 * @returns {string | undefined}
 */
export function resolveLocale(el, explicit) {
  return explicit || current || (el && globalThis.document ? nearest(el, 'lang') : null) || undefined;
}
