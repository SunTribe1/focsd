/**
 * Phone numbers for the phone field: a compact country table (dial code, national length range,
 * trunk prefix, example) and normalization to E.164. Validation checks lengths only; apps that need
 * carrier-level rules pass the phone field a `validator` (for example one built on libphonenumber-js).
 */
import { DATA } from './phone-data.js';
import { latinDigits } from './digits.js';

/**
 * @typedef {object} PhoneCountry
 * @property {string} code ISO 3166 alpha-2, e.g. "GB".
 * @property {string} dial Country calling code without "+", e.g. "44".
 * @property {number} min Shortest national number.
 * @property {number} max Longest national number.
 * @property {string} trunk National (trunk) prefix dialled before national numbers, e.g. "0".
 * @property {string} example An example national (mobile) number.
 * @property {number[]} groups Digit groups of the example, e.g. [4, 6].
 * @property {boolean} main Whether it is the main country for its dial code (US for +1).
 */

/** @type {PhoneCountry[]} */
export const COUNTRIES = DATA.split(';').map((record) => {
  const [code = '', dial = '', min, max, trunk = '', example = '', groups, main] = record.split(',');

  return {
    code,
    dial,
    min: Number(min),
    max: Number(max),
    trunk,
    example,
    groups: groups ? groups.split('.').map(Number) : [],
    main: main === '1',
  };
});

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));
const MAIN_BY_DIAL = new Map(COUNTRIES.filter((c) => c.main).map((c) => [c.dial, c]));

/** @param {string | null | undefined} code */
export const countryOf = (code) => BY_CODE.get(String(code ?? '').toUpperCase());

/**
 * Country names by locale, then by code. Names never change for a locale, so they are looked up once.
 * @type {Map<string, Map<string, string>>}
 */
const NAMES = new Map();

/**
 * @param {string} code
 * @param {string} locale
 */
function lookupName(code, locale) {
  try {
    return new Intl.DisplayNames([locale, 'en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * The country's name in `locale` (falls back to the code).
 * @param {string} code
 * @param {string} [locale]
 * @returns {string}
 */
export function countryName(code, locale = 'en') {
  const names = NAMES.get(locale) ?? new Map();
  NAMES.set(locale, names);
  const known = names.get(code);

  if (known !== undefined) return known;
  const name = lookupName(code, locale);
  names.set(code, name);

  return name;
}

/** @typedef {Readonly<PhoneCountry & { name: string }>} NamedCountry */

/**
 * Every country with its name in `locale`, sorted by name. Built once per locale.
 * @type {Map<string, readonly NamedCountry[]>}
 */
const SORTED = new Map();

/** @param {string} locale */
function collator(locale) {
  try {
    return new Intl.Collator(locale);
  } catch {
    return new Intl.Collator('en');
  }
}

/**
 * All countries named in `locale` and sorted by that name (cached per locale; do not mutate).
 * @param {string} [locale]
 * @returns {readonly NamedCountry[]}
 */
export function countriesByName(locale = 'en') {
  const cached = SORTED.get(locale);

  if (cached) return cached;
  const { compare } = collator(locale);

  const list = Object.freeze(
    COUNTRIES.map((c) => Object.freeze({ ...c, name: countryName(c.code, locale) })).toSorted((a, b) => compare(a.name, b.name)),
  );

  SORTED.set(locale, list);

  return list;
}

/**
 * The flag emoji for a region code (regional indicator symbols).
 * @param {string | null | undefined} code
 * @returns {string}
 */
export const flag = (code) =>
  String(code ?? '')
    .toUpperCase()
    .replaceAll(/[A-Z]/g, (c) => String.fromCodePoint(0x1f1a5 + (c.codePointAt(0) ?? 0)));

/**
 * The region part of a locale ("en-GB" → "GB"), or undefined.
 * @param {string} locale
 * @returns {string | undefined}
 */
export function regionOf(locale) {
  try {
    return new Intl.Locale(locale).region;
  } catch {
    return undefined;
  }
}

/**
 * Parse typed or pasted text in the context of `country`. A leading "+" or "00" switches to the
 * country of that dial code (keeping `country` when it shares it, as Canada shares +1).
 * @param {string | null | undefined} text
 * @param {string | null | undefined} country
 * @returns {{ country: string, national: string, e164: string } | null}
 */
export function parsePhone(text, country) {
  // Clipboard noise: fullwidth characters, bidi marks, any kind of dash, a tel: link.
  let raw = latinDigits(String(text ?? '').normalize('NFKC'))
    .replaceAll(/\p{Cf}/gu, '')
    .replaceAll(/\p{Pd}/gu, '-')
    .trim()
    .replace(/^tel:/i, '');

  // "(0)" after an international prefix is the trunk written out of habit: drop it.
  raw = raw.replaceAll('(0)', '');
  const international = /^\s*(\+|00)/.test(raw);
  let digits = raw.replaceAll(/\D/g, '');

  if (!digits) return null;

  if (/[^\d\s()+.\-/]/.test(raw)) return null;
  let current = countryOf(country);

  if (international) {
    if (raw.trimStart().startsWith('00')) digits = digits.slice(2);
    let match = null;

    for (let n = 1; n <= 3 && !match; n += 1) {
      const dial = digits.slice(0, n);

      if (current?.dial === dial) match = current;
      else if (MAIN_BY_DIAL.has(dial)) match = MAIN_BY_DIAL.get(dial);
    }

    if (!match) return null;
    current = match;
    digits = digits.slice(match.dial.length);

    // "+44 020…": the trunk prefix written out of habit after the country code.
    if (current.trunk && digits.startsWith(current.trunk) && digits.length > current.max) digits = digits.slice(current.trunk.length);
  } else if (!current) return null;
  else if (current.trunk && digits.startsWith(current.trunk) && digits.length - current.trunk.length >= current.min) {
    digits = digits.slice(current.trunk.length);
  }

  if (!digits) return null;

  return { country: current.code, national: digits, e164: `+${current.dial}${digits}` };
}

/**
 * True when the national number has a possible length for its country.
 * @param {{ national: string, country: string }} phone
 * @returns {boolean}
 */
export function isValidPhone({ national, country }) {
  const c = countryOf(country);

  if (!c || !/^\d+$/.test(String(national ?? ''))) return false;

  return national.length >= c.min && national.length <= c.max;
}

/**
 * Group the digits like the country's example when the length matches; otherwise leave them as typed.
 * @param {string} national
 * @param {string} country
 * @returns {string}
 */
export function formatNational(national, country) {
  const c = countryOf(country);
  const total = c?.groups.reduce((a, b) => a + b, 0);

  if (!c || total !== national.length) return national;
  /** @type {string[]} */
  const out = [];
  let at = 0;

  for (const size of c.groups) {
    out.push(national.slice(at, at + size));
    at += size;
  }

  return out.join(' ');
}
