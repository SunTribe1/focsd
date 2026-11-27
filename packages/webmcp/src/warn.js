/** @type {Set<string>} */
const warned = new Set();

/**
 * Warn once per key (per page), with the `Focsd: ` prefix: the same contract as `warnOnce` in
 * `@focsd/primitives/internal`. This package does not depend on primitives, so it keeps a copy
 * (B14 ruling on m37).
 * @param {string} key Stable id for this warning, e.g. `webmcp:register:search`.
 * @param {string} message
 * @param {...unknown} details Logged after the message.
 */
export function warnOnce(key, message, ...details) {
  if (warned.has(key)) return;
  warned.add(key);
  globalThis.console?.warn(`Focsd: ${message}`, ...details);
}
