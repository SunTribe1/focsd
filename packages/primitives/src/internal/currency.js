/**
 * Currency helpers for the currency field, all from `Intl`: minor units, locale-aware parsing of
 * typed or pasted amounts (any digits, group and decimal symbols, currency signs), formatting and
 * a dot-decimal serialization for forms.
 */

import { latinDigits } from './digits.js';

const nbsp = /[\u00a0\u202f]/g;

/**
 * Decimal places of a currency (2 for USD, 0 for JPY, 3 for KWD).
 * @param {string} currency
 * @returns {number}
 */
export function minorUnits(currency) {
  try {
    // Always set for style: 'currency'.
    return /** @type {number} */ (new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits);
  } catch {
    return 2;
  }
}

/** @type {Map<string, { group: string, decimal: string }>} */
const symbolsCache = new Map();

/**
 * The locale's group and decimal symbols.
 * @param {string} locale
 * @returns {{ group: string, decimal: string }}
 */
function symbols(locale) {
  const cached = symbolsCache.get(locale);

  if (cached) return cached;
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);

  const result = {
    group: parts.find((p) => p.type === 'group')?.value ?? ',',
    decimal: parts.find((p) => p.type === 'decimal')?.value ?? '.',
  };

  symbolsCache.set(locale, result);

  return result;
}

/**
 * The currency texts in one formatting of `n` (none when `Intl` does not know the currency).
 * @param {string} lang
 * @param {string} currency
 * @param {string} currencyDisplay
 * @param {number} n
 * @returns {string[]}
 */
function currencyParts(lang, currency, currencyDisplay, n) {
  try {
    return new Intl.NumberFormat(lang, /** @type {Intl.NumberFormatOptions} */ ({ style: 'currency', currency, currencyDisplay }))
      .formatToParts(n)
      .filter((p) => p.type === 'currency')
      .map((p) => p.value.normalize('NFKC').toLocaleLowerCase());
  } catch {
    return []; // unknown currency
  }
}

/** @type {Map<string, string[]>} */
const affixCache = new Map();

/**
 * Every text that can surround an amount of `currency` (symbols, codes, names, singular and plural).
 * @param {string} locale
 * @param {string} currency
 * @returns {string[]}
 */
function currencyTexts(locale, currency) {
  const key = `${locale}|${currency}`;
  const cached = affixCache.get(key);

  if (cached) return cached;
  /** @type {Set<string>} */
  const texts = new Set();

  for (const lang of [locale, 'en'])
    for (const currencyDisplay of ['symbol', 'narrowSymbol', 'code', 'name'])
      for (const n of [0.5, 1, 2, 5, 11, 100]) for (const text of currencyParts(lang, currency, currencyDisplay, n)) texts.add(text);
  const list = [...texts].filter(Boolean).toSorted((a, b) => b.length - a.length);
  affixCache.set(key, list);

  return list;
}

/** @type {Set<string> | null} */
let isoCodes = null;

/** @param {string} word */
const isCurrencyCode = (word) => {
  isoCodes ??= new Set(Intl.supportedValuesOf?.('currency'));

  return isoCodes.has(word.toUpperCase());
};

/**
 * Integer groups must be 1–3 digits, then 2 or 3 (Indian lakh/crore grouping), ending in 3.
 * @param {string[]} groups
 */
const validGrouping = ([first = '', ...rest]) =>
  first.length >= 1 && first.length <= 3 && rest.every((g, i) => g.length === 3 || (g.length === 2 && i < rest.length - 1));

/**
 * Lower-cased Latin-digit text with the currency's symbols, names and codes blanked out.
 * @param {string} text
 * @param {string} locale
 * @param {string} [currency]
 */
function stripCurrency(text, locale, currency) {
  let t = latinDigits(
    String(text ?? '')
      .normalize('NFKC')
      .replaceAll(/\p{Cf}/gu, ''),
  )
    .toLocaleLowerCase()
    .trim();

  if (currency) for (const name of currencyTexts(locale, currency)) t = t.replaceAll(name, ' ');

  return t.replaceAll(/\p{Sc}/gu, ' ').replaceAll(/\p{L}{3}/gu, (word) => (isCurrencyCode(word) ? ' ' : word));
}

/**
 * The decimal separator of `t` (digits and separators only): null when it has none, false when
 * it cannot be told.
 * @param {string} t
 * @param {{ group: string, decimal: string }} symbols The locale's symbols.
 * @returns {string | null | false}
 */
function decimalSeparator(t, { group, decimal }) {
  if (t.includes('٫')) return '٫';
  const separators = [...new Set(t.replaceAll(/\d/g, ''))];

  if (separators.length === 2) return t.lastIndexOf('.') > t.lastIndexOf(',') ? '.' : ',';

  if (separators.length > 2) return false;

  if (separators.length !== 1) return null;
  const sep = /** @type {string} */ (separators[0]);
  const halves = t.split(sep);

  if (halves.length !== 2) return null;

  if (sep === decimal) return decimal;

  return sep !== group.trim() && !validGrouping(halves) ? sep : null;
}

/**
 * The number in `t` (digits and separators only) split at `dec`, or null when the digits or the
 * grouping are not valid.
 * @param {string} t
 * @param {string | null} dec
 */
function toNumber(t, dec) {
  const [int = '', frac, extra] = dec ? t.split(dec) : [t];

  if (extra !== undefined) return null;
  const groups = int.split(/[.,]/);

  if (groups.length > 1 && !validGrouping(groups)) return null;
  const digits = groups.join('');

  if (!/^\d*$/.test(digits) || (frac !== undefined && !/^\d*$/.test(frac)) || (!digits && !frac)) return null;

  return Number(`${digits || '0'}.${frac || '0'}`);
}

/**
 * Parse an amount typed or pasted in `locale` ("1.234,56" in German, "$1,234.5", "(12.00)" for a
 * negative, native digits, the field's own formatted text). Text in the other common format is
 * read too ("1.234,56" pasted into an English page). Returns null when the text is not an amount or
 * is ambiguous ("1.5" in German): a wrong number is worse than an error.
 * @param {string} text
 * @param {string} [locale]
 * @param {string} [currency] The field's currency, so its own symbols and names are understood.
 */
export function parseAmount(text, locale = 'en', currency = undefined) {
  let t = stripCurrency(text, locale, currency);
  const negative = /^\s*\(.*\)\s*$/.test(t) || /^\s*[-−‐]|[-−‐]\s*$/.test(t);
  t = t.replaceAll(/[\s()\-−‐]/g, '');

  if (!t || /[^\d.,'’٫٬]/.test(t)) return null;
  // Arabic separators are unambiguous; apostrophes only group.
  t = t.replaceAll('٬', ',').replaceAll(/['’]/g, '');
  const dec = decimalSeparator(t, symbols(locale));
  const n = dec === false ? null : toNumber(t, dec);

  return n !== null && negative ? -n : n;
}

/**
 * Format an amount: with the currency (default) or as a plain number with the currency's decimals
 * (`symbol: false`, used while editing).
 * @param {number} n
 * @param {{ locale?: string, currency?: string, display?: string, grouping?: boolean, symbol?: boolean }} [options]
 * @returns {string}
 */
export function formatAmount(n, { locale = 'en', currency = 'USD', display = 'symbol', grouping = true, symbol = true } = {}) {
  const digits = minorUnits(currency);

  const options = symbol
    ? { style: 'currency', currency, currencyDisplay: display, useGrouping: grouping }
    : { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: grouping };

  return new Intl.NumberFormat(locale, /** @type {Intl.NumberFormatOptions} */ (options)).format(n).replaceAll(nbsp, ' ');
}

/**
 * Text before and after the number when `locale` formats `currency` ("$" / "" or "" / " €").
 * @param {string} locale
 * @param {string} currency
 * @param {string} [display]
 * @returns {{ prefix: string, suffix: string }}
 */
export function affix(locale, currency, display = 'symbol') {
  const parts = new Intl.NumberFormat(
    locale,
    /** @type {Intl.NumberFormatOptions} */ ({ style: 'currency', currency, currencyDisplay: display }),
  ).formatToParts(1);

  const first = parts.findIndex((p) => p.type === 'integer');
  const last = parts.findLastIndex((p) => p.type === 'integer' || p.type === 'fraction' || p.type === 'decimal');

  /** @param {Intl.NumberFormatPart[]} list */
  const text = (list) =>
    list
      .map((p) => p.value)
      .join('')
      .replaceAll(nbsp, ' ');

  return { prefix: text(parts.slice(0, first)), suffix: text(parts.slice(last + 1)) };
}

/**
 * The amount as a dot-decimal string with exactly the currency's decimals, rounded half away from zero.
 * @param {number} n
 * @param {string} currency
 * @returns {string}
 */
export function toValue(n, currency) {
  const digits = minorUnits(currency);
  const scaled = Math.round(Math.abs(Number(`${Math.abs(n)}e${digits}`)));
  const value = Number(`${scaled}e-${digits}`);

  return `${n < 0 && scaled !== 0 ? '-' : ''}${value.toFixed(digits)}`;
}
