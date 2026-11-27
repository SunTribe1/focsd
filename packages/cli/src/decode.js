/**
 * Decoding parsed JSON (focsd.json): which kind of JSON value something is, by its built-in tag.
 * JSON.parse yields only plain objects, arrays, strings, numbers, booleans and null.
 */

/** @param {unknown} value */
const tag = (value) => Object.prototype.toString.call(value);

/**
 * @param {unknown} value
 * @returns {value is string}
 */
export const isText = (value) => tag(value) === '[object String]';

/**
 * A plain JSON object (not an array or null).
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
export const isRecord = (value) => tag(value) === '[object Object]';
