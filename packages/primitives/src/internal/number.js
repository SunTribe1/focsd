/**
 * A numeric property as a finite number, or undefined when unset: a removed attribute is null and a
 * property set from script may be '' or not a number.
 * @param {unknown} v
 * @returns {number | undefined}
 */
export const finiteOrUndefined = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? undefined : Number(v));

/**
 * `value` kept within `min` and `max`.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
