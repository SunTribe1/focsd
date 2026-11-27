/** @type {Set<string>} */
const warned = new Set();

/**
 * Warn once per key (per page), with the `Focsd: ` prefix, so a problem that repeats on every render
 * shows up once in the console.
 * @param {string} key Stable id for this warning, e.g. `icon:remote:star`.
 * @param {string} message
 * @param {...unknown} details Logged after the message, such as the element at fault.
 */
export function warnOnce(key, message, ...details) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`Focsd: ${message}`, ...details);
}
