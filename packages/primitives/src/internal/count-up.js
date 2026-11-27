/**
 * Number text helpers for the stat tile and the animated number (private: bases import it by
 * relative path): Intl formatting that never throws, and the count-up math.
 */
import { warnOnce } from './warn.js';

/** The most decimals a counting frame keeps, so float noise (0.1 + 0.2) does not show. */
const MAX_DIGITS = 6;

/**
 * A short, readable format: a kind, then for `currency` and `unit` its code, then optionally the
 * maximum number of decimals. `currency USD`, `currency EUR 0`, `percent`, `percent 1`, `compact`,
 * `unit kilometer-per-hour`, `decimal 2`.
 * @param {string} text
 * @returns {Intl.NumberFormatOptions | undefined}
 */
export function parseFormatShorthand(text) {
  const [kind = '', ...rest] = text.trim().split(/\s+/);
  const last = rest.at(-1);
  const decimals = last !== undefined && /^\d+$/.test(last) ? Number(rest.pop()) : undefined;
  const code = rest[0];
  /** @type {Intl.NumberFormatOptions | undefined} */
  let options;

  if (kind === 'currency' && code) options = { style: 'currency', currency: code.toUpperCase() };
  else if (kind === 'unit' && code) options = { style: 'unit', unit: code };
  else if (kind === 'percent') options = { style: 'percent' };
  else if (kind === 'compact') options = { notation: 'compact' };
  else if (kind === 'decimal') options = { style: 'decimal' };

  if (options && decimals !== undefined) options = { ...options, minimumFractionDigits: 0, maximumFractionDigits: decimals };

  return options;
}

/**
 * Attribute converter for `Intl.NumberFormat` options: a short form (`format="currency USD"`, see
 * `parseFormatShorthand`) or a JSON object (`format='{"style":"percent"}'`) for anything else.
 */
export const intlOptions = {
  /** @param {string | null} value */
  fromAttribute(value) {
    if (!value?.trim()) return undefined;

    if (!value.trim().startsWith('{')) {
      const short = parseFormatShorthand(value);

      if (short) return short;
    }

    try {
      const parsed = JSON.parse(value);

      // A plain object, not an array, string or number.
      if (parsed?.constructor === Object) return parsed;
    } catch {
      // Reported below.
    }

    warnOnce(
      'intl-options:json',
      `A format attribute must be a short form ("currency USD", "percent 1", "compact", "unit kilometer", "decimal 2") or a JSON object of Intl.NumberFormat options; got ${value}.`,
    );

    return undefined;
  },
  toAttribute: (/** @type {Intl.NumberFormatOptions | undefined} */ value) => (value ? JSON.stringify(value) : null),
};

/**
 * `value` formatted for `locale` with `options`; options Intl rejects fall back to plain numbers (warned once).
 * @param {number} value
 * @param {Intl.NumberFormatOptions | undefined} options
 * @param {string | undefined} locale
 * @returns {string}
 */
export function formatIntl(value, options, locale) {
  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    warnOnce(`intl-options:${reason}`, `Could not format a number with ${JSON.stringify(options)} (${reason}); showing a plain number.`);

    return new Intl.NumberFormat(locale).format(value);
  }
}

/**
 * Ease-out cubic: fast at first, settling on the final value.
 * @param {number} t Progress from 0 to 1.
 * @returns {number}
 */
export const easeOut = (t) => 1 - (1 - t) ** 3;

/**
 * The most decimals among `numbers` (capped), so counting frames are rounded like their ends.
 * @param {...number} numbers
 * @returns {number}
 */
export function fractionDigits(...numbers) {
  return Math.min(
    MAX_DIGITS,
    Math.max(
      0,
      ...numbers.map((n) => {
        const [, decimals = ''] = String(n).split('.');

        return /e/i.test(String(n)) ? 0 : decimals.length;
      }),
    ),
  );
}

/**
 * The number shown at `progress` (0–1) of a count from `start` to `end`, eased and rounded.
 * @param {number} start
 * @param {number} end
 * @param {number} progress
 * @returns {number}
 */
export function frameValue(start, end, progress) {
  if (progress >= 1) return end;
  const scale = 10 ** fractionDigits(start, end);

  return Math.round((start + (end - start) * easeOut(Math.max(0, progress))) * scale) / scale;
}

/**
 * A CSS time (`240ms`, `0.3s`) in milliseconds, or `fallback` when it is not one.
 * @param {string} text
 * @param {number} fallback
 * @returns {number}
 */
export function parseDuration(text, fallback) {
  const match = /^([\d.]+)(ms|s)$/.exec(text.trim());

  if (!match) return fallback;

  return Number(match[1]) * (match[2] === 's' ? 1000 : 1);
}

/** Whether the reader asked for reduced motion (false on the server). */
export const prefersReducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
