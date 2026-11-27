/**
 * Number and byte-size formatting on `Intl.NumberFormat` (private: bases import it by relative path).
 * Without a `locale` it formats with `setLocale()`'s default, else the runtime's locale.
 */

import { resolveLocale } from './locale.js';

/** Decimal byte units, each 1000 times the last (`Intl` sanctioned units). */
const DECIMAL_UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte', 'petabyte'];

/** IEC symbols for binary sizes; `Intl` has no kibibyte unit. */
const BINARY_UNITS = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];

/**
 * @typedef {object} ByteSizeOptions
 * @property {string} [locale] A BCP 47 locale tag; `setLocale()`'s default, else the runtime's locale, when empty.
 * @property {boolean} [binary] 1024-based IEC units (KiB, MiB) instead of 1000-based (kB, MB).
 * @property {'standard' | 'scientific' | 'engineering' | 'compact'} [notation]
 * @property {number} [maximumFractionDigits] Defaults to 1.
 */

/**
 * @typedef {object} FormatNumberOptions
 * @property {'decimal' | 'currency' | 'percent' | 'unit' | 'bytes'} [type]
 * @property {string} [currency] ISO 4217 code for `type: 'currency'`.
 * @property {string} [unit] A sanctioned unit for `type: 'unit'`.
 * @property {'standard' | 'scientific' | 'engineering' | 'compact'} [notation]
 * @property {number} [minimumFractionDigits]
 * @property {number} [maximumFractionDigits]
 * @property {string} [locale] A BCP 47 locale tag; `setLocale()`'s default, else the runtime's locale, when empty.
 * @property {boolean} [binary] For `type: 'bytes'`: IEC units.
 */

/**
 * Scale a byte count to the largest unit it reaches.
 * @param {number} value
 * @param {number} base 1000 or 1024
 * @returns {{ amount: number, index: number }}
 */
function scaleBytes(value, base) {
  let amount = value;
  let index = 0;

  while (Math.abs(amount) >= base && index < DECIMAL_UNITS.length - 1) {
    amount /= base;
    index += 1;
  }

  return { amount, index };
}

/**
 * A byte size for people: "1.5 kB", or with `binary` "1.5 KiB".
 * @param {number} value Bytes.
 * @param {ByteSizeOptions} [options]
 * @returns {string}
 */
export function formatByteSize(value, { locale, binary = false, notation, maximumFractionDigits = 1 } = {}) {
  const { amount, index } = scaleBytes(value, binary ? 1024 : 1000);
  /** @type {Intl.NumberFormatOptions} */
  const shared = { notation, maximumFractionDigits };

  if (binary) return `${new Intl.NumberFormat(resolveLocale(null, locale), shared).format(amount)} ${BINARY_UNITS[index]}`;

  return new Intl.NumberFormat(resolveLocale(null, locale), { ...shared, style: 'unit', unit: DECIMAL_UNITS[index] }).format(amount);
}

/**
 * A number for the reader's locale: decimal, currency, percent, unit or bytes.
 * Throws what `Intl.NumberFormat` throws (an unknown currency or unit, an invalid locale).
 * @param {number} value
 * @param {FormatNumberOptions} [options]
 * @returns {string}
 */
export function formatNumber(value, options = {}) {
  const { type = 'decimal', currency, unit, notation, minimumFractionDigits, maximumFractionDigits, locale, binary } = options;

  if (type === 'bytes') return formatByteSize(value, { locale, binary, notation, maximumFractionDigits });

  /** @type {Intl.NumberFormatOptions} */
  const intl = {
    style: type,
    notation,
    minimumFractionDigits,
    maximumFractionDigits,
    currency: type === 'currency' ? currency : undefined,
    unit: type === 'unit' ? unit : undefined,
  };

  return new Intl.NumberFormat(resolveLocale(null, locale), intl).format(value);
}
