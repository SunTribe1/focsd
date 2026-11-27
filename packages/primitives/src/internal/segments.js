/**
 * Pure stepping and digit-typing for segmented date and time fields (hours, minutes, day, month, year).
 * Private to the primitives package: bases import it by relative path.
 */

/** @typedef {{ min: number, max: number, length: number }} SegmentRange */
/** @typedef {{ value: number | null, buffer: string, advance: boolean, carry?: number }} TypedDigit */

/**
 * Step a segment by `delta`, wrapping within `[min, max]`. From empty, a positive delta gives `min`, a
 * negative one `max`.
 * @param {number | null} value
 * @param {number} delta
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export const stepSegment = (value, delta, min, max) => {
  if (value === null) return delta > 0 ? min : max;
  const span = max - min + 1;

  return min + ((((value - min + delta) % span) + span) % span);
};

/**
 * Type `digit` into a segment holding `buffer` (the digits typed so far). The result's `value` is the
 * segment's new value (`null` while the digits are still below `min`), `buffer` the digits to keep,
 * `advance` whether focus moves on, and `carry` a digit that did not fit, for the next segment.
 * `value` is returned on every keystroke, also while buffering (a year reads 2, 20, 202, 2026).
 * `value: null` with `carry`: the buffered digits are final but below `min` (`00` for a month); the caller
 * decides whether that clears the segment. `value: null` without `carry`: still buffering below `min`
 * (a leading 0), or a one-digit segment typed below `min`.
 * @param {string} buffer
 * @param {number} digit
 * @param {SegmentRange} range
 * @returns {TypedDigit}
 */
export const typeDigit = (buffer, digit, { min, max, length }) => {
  const text = buffer + digit;
  const n = Number(text);
  const fits = n <= max && (n >= min || text.length < length);

  // The buffered digits are final; the new digit starts the next segment.
  if (buffer && !fits) {
    const first = Number(buffer);

    return { value: first < min ? null : first, buffer: '', advance: true, carry: digit };
  }

  const value = n < min ? null : n;

  return text.length >= length || n * 10 > max ? { value, buffer: '', advance: true } : { value, buffer: text, advance: false };
};

/**
 * Arabic-Indic (U+0660–0669) and Extended Arabic-Indic (U+06F0–06F9) digits as ASCII digits; both
 * blocks end in 0–9 in their low nibble.
 * @param {string} text
 * @returns {string}
 */
export const asciiDigits = (text) => text.replaceAll(/[\u0660-\u0669\u06F0-\u06F9]/g, (c) => String((c.codePointAt(0) ?? 0) & 0xf));

/**
 * Days in a month (1-based), with the Gregorian leap rule; February has 29 when the year is unknown.
 * @param {number} month
 * @param {number | null} year
 * @returns {number}
 */
export const daysInMonth = (month, year) => {
  if (month !== 2) return [4, 6, 9, 11].includes(month) ? 30 : 31;

  return year === null || (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 29 : 28;
};

const EDIT_KEYS = /^(ArrowUp|ArrowDown|PageUp|PageDown|Home|End|Backspace|Delete|\d)$/;

/**
 * Read-only segments stay focusable and navigable, but values do not change: swallow only the keys a
 * segmented field would act on; Escape (close requests), Tab, Left/Right and shortcuts pass through.
 * @param {KeyboardEvent} event
 * @param {string} [key] the key with any native digits made ASCII (defaults to `event.key`)
 * @param {string} [letters] single-character keys the field also acts on (`apAP` for AM/PM)
 */
export const swallowEditKey = (event, key = event.key, letters = '') => {
  const edits = EDIT_KEYS.test(key) || (key.length === 1 && letters.includes(key));

  if (edits && !event.ctrlKey && !event.metaKey && !event.altKey) event.preventDefault();
};
