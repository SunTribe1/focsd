import { warnOnce } from './warn.js';

/**
 * Warn once (per page) that an API is deprecated. Deprecated APIs keep working for at least one
 * minor release and are removed in the next major (see VERSIONING.md).
 * @param {string} id Stable id for this deprecation, e.g. `rating.readonly`.
 * @param {string} what What is deprecated, e.g. "focsd-rating `readonly` property".
 * @param {string} instead What to use instead, e.g. "use `readOnly`".
 */
export function deprecated(id, what, instead) {
  warnOnce(`deprecated:${id}`, `${what} is deprecated and will be removed in the next major version; ${instead}.`);
}
