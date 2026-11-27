/**
 * Shared by focsd-theme-toggle and focsd-theme-picker: where a choice is applied (the `target`) and
 * stored (`localStorage`, under `<prefix>theme` / `<prefix>brand`). Storage can throw (private mode,
 * blocked site data, quota); a failed read is "nothing stored" and a failed write is ignored.
 */

/**
 * The stored value, or null when none is stored or storage is unavailable.
 * @param {string} prefix
 * @param {string} key
 */
export function readStored(prefix, key) {
  try {
    return globalThis.localStorage?.getItem(prefix + key) ?? null;
  } catch {
    return null;
  }
}

/**
 * Store a value, or remove the key for null. Never throws.
 * @param {string} prefix
 * @param {string} key
 * @param {string | null} value
 */
export function writeStored(prefix, key, value) {
  try {
    if (value === null) globalThis.localStorage?.removeItem(prefix + key);
    else globalThis.localStorage?.setItem(prefix + key, value);
  } catch {
    // Storage refused: the choice still applies to this page.
  }
}

/**
 * The element a choice applies to: the first match of `selector`, or `<html>` without one. Null
 * when nothing matches, the selector is invalid or there is no document (server rendering).
 * @param {string} selector
 * @returns {HTMLElement | null}
 */
export function resolveTarget(selector) {
  const doc = globalThis.document;

  if (!doc) return null;

  if (!selector) return doc.documentElement;

  try {
    return doc.querySelector(selector);
  } catch {
    return null;
  }
}

/** @type {MediaQueryList | undefined} */
let darkQuery;

/** The `prefers-color-scheme: dark` query, created once (undefined without matchMedia). */
const darkScheme = () => (darkQuery ??= globalThis.matchMedia?.('(prefers-color-scheme: dark)'));

/**
 * Whether a target shows light or dark colors: its theme attribute, else the OS preference. The
 * contrast theme counts as light.
 * @param {Element | null} target
 * @returns {'light' | 'dark'}
 */
export function schemeOf(target) {
  const theme = target?.getAttribute('data-focsd-theme');

  if (theme) return theme === 'dark' ? 'dark' : 'light';

  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Call `onChange` when the target's theme or brand attribute changes, or the OS color scheme
 * does. Returns the function that stops watching.
 * @param {Element} target
 * @param {() => void} onChange
 */
export function watchTheme(target, onChange) {
  const observer = new MutationObserver(onChange);
  observer.observe(target, { attributes: true, attributeFilter: ['data-focsd-theme', 'data-focsd-brand'] });
  const query = darkScheme();
  query?.addEventListener('change', onChange);

  return () => {
    observer.disconnect();
    query?.removeEventListener('change', onChange);
  };
}
