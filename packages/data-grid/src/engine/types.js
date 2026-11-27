/**
 * Column type registry. A type knows how to compare, format and parse its values, which filter
 * operators apply, and which editor to use. Comparators never see empty values: callers place
 * empties last (see sort.js), so `compare` can assume real values.
 */

import { fold } from '@focsd/primitives/internal';

/**
 * @typedef {import('./model.js').ColumnTypeDef} ColumnTypeDef
 * @typedef {import('./model.js').FilterOperator} FilterOperator
 */

/** True for null, undefined, '' and NaN. */
export const isEmpty = (/** @type {unknown} */ v) => v == null || v === '' || Number.isNaN(v);

const DAY = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parsed date strings kept before the cache starts over (bounds memory on huge grids). */
const TIME_CACHE_LIMIT = 50_000;

/** Milliseconds for a date value: `YYYY-MM-DD` (UTC midnight), any ISO string, or a Date. */
/** @type {Map<unknown, number>} */
const timeCache = new Map();

/**
 * @param {unknown} value
 * @returns {number}
 */
export function toTime(value) {
  if (value instanceof Date) return value.getTime();
  let time = timeCache.get(value);

  if (time === undefined) {
    const text = /** @type {string} */ (value);
    const m = ISO_DATE.exec(text);
    time = m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : Date.parse(text);

    if (timeCache.size > TIME_CACHE_LIMIT) timeCache.clear();
    timeCache.set(value, time);
  }

  return time;
}

/**
 * Whole day number, so date filters compare days rather than instants. `Date` objects use their
 * local calendar day (a local-midnight Date is that day everywhere); strings use the UTC day.
 */
export const toDay = (/** @type {unknown} */ value) =>
  value instanceof Date
    ? Math.floor(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / DAY)
    : Math.floor(toTime(value) / DAY);

/** `YYYY-MM-DD` for a date value (local calendar day for Date objects), or '' when empty. */
export const toISODay = (/** @type {unknown} */ value) => (isEmpty(value) ? '' : new Date(toDay(value) * DAY).toISOString().slice(0, 10));

/** Lower-case, accent-free text for matching ("Café" matches "cafe"): the library's one fold. */
export { fold };

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/** @type {{ empty: FilterOperator, notEmpty: FilterOperator }} */
const emptyOps = {
  empty: { label: 'is empty', arity: 0, test: (v) => isEmpty(v) },
  notEmpty: { label: 'is not empty', arity: 0, test: (v) => !isEmpty(v) },
};

/** @type {ColumnTypeDef} */
const text = {
  editor: 'text',
  compare: (a, b) => collator.compare(String(a), String(b)),
  format: (v) => (isEmpty(v) ? '' : String(v)),
  parse: (input) => ({ value: input === '' ? null : input }),
  operators: {
    contains: { label: 'contains', arity: 1, symbol: 'contains', test: (v, o) => fold(v).includes(fold(o)) },
    notContains: { label: 'does not contain', arity: 1, symbol: 'does not contain', test: (v, o) => !fold(v).includes(fold(o)) },
    equals: { label: 'equals', arity: 1, symbol: 'is', test: (v, o) => fold(v) === fold(o) },
    notEquals: { label: 'does not equal', arity: 1, symbol: 'is not', test: (v, o) => fold(v) !== fold(o) },
    startsWith: { label: 'starts with', arity: 1, symbol: 'starts with', test: (v, o) => fold(v).startsWith(fold(o)) },
    endsWith: { label: 'ends with', arity: 1, symbol: 'ends with', test: (v, o) => fold(v).endsWith(fold(o)) },
    ...emptyOps,
  },
};

/** @type {Map<string, Intl.NumberFormat>} */
const numberFormats = new Map();

/**
 * @param {string | undefined} locale
 * @param {Intl.NumberFormatOptions | undefined} options
 */
const numberFormat = (locale, options) => {
  const key = `${locale}|${JSON.stringify(options ?? {})}`;

  if (!numberFormats.has(key)) numberFormats.set(key, new Intl.NumberFormat(locale, options));

  return /** @type {Intl.NumberFormat} */ (numberFormats.get(key));
};

/** @type {Map<string, { group: string, decimal: string }>} */
const separatorCache = new Map();

/**
 * Group and decimal separators for a locale ("." and "," in en; "." and "," swapped in de).
 * @param {string} [locale]
 * @returns {{ group: string, decimal: string }}
 */
function separators(locale) {
  const key = locale ?? '';

  if (!separatorCache.has(key)) {
    const parts = new Intl.NumberFormat(locale).formatToParts(1234567.5);
    separatorCache.set(key, {
      group: parts.find((p) => p.type === 'group')?.value ?? ',',
      decimal: parts.find((p) => p.type === 'decimal')?.value ?? '.',
    });
  }

  return /** @type {{ group: string, decimal: string }} */ (separatorCache.get(key));
}

const escapeRe = (/** @type {string} */ s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Parse user input as a number in the given locale. Group separators (and spaces) are removed,
 * the locale's decimal separator becomes ".". Input with a second decimal separator, or a
 * character that is neither a digit nor a separator, is rejected rather than guessed.
 * @param {unknown} input
 * @param {string} [locale]
 * @returns {import('./model.js').EditResult}
 */
function parseNumber(input, locale) {
  const raw = String(input ?? '').trim();

  if (raw === '') return { value: null };
  const { group, decimal } = separators(locale);
  const spaceGroup = /\s/.test(group);
  let cleaned = raw.replaceAll(/[\s\u00a0\u202f]/g, ' ').trim();
  // Group separators are only accepted in proper groups of three ("1.234,5" yes, "1.5" no in de).
  const g = spaceGroup ? ' ' : group;

  if (cleaned.includes(g)) {
    const grouped = new RegExp(`^[-+]?\\d{1,3}(${escapeRe(g)}\\d{3})+(${escapeRe(decimal)}\\d*)?$`);

    if (!grouped.test(cleaned)) return { error: 'Enter a number.', code: 'enterNumber' };
    cleaned = cleaned.split(g).join('');
  }

  if (cleaned.split(decimal).length > 2) return { error: 'Enter a number.', code: 'enterNumber' };

  if (decimal !== '.' && cleaned.includes('.')) return { error: 'Enter a number.', code: 'enterNumber' };
  const normalized = cleaned.replace(decimal, '.');

  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(normalized)) return { error: 'Enter a number.', code: 'enterNumber' };
  const value = Number(normalized);

  return Number.isFinite(value) ? { value } : { error: 'Enter a number.', code: 'enterNumber' };
}

/** @type {ColumnTypeDef} */
const number = {
  editor: 'number',
  compare: (a, b) => /** @type {number} */ (a) - /** @type {number} */ (b),
  format: (v, column = {}, locale) => (isEmpty(v) ? '' : numberFormat(locale, column.formatOptions).format(/** @type {number} */ (v))),
  parse: (input, column, locale) => parseNumber(input, locale),
  operators: {
    eq: { label: 'equals', arity: 1, symbol: '=', test: (v, o) => !isEmpty(v) && v === Number(o) },
    neq: { label: 'does not equal', arity: 1, symbol: '≠', test: (v, o) => isEmpty(v) || v !== Number(o) },
    lt: { label: 'less than', arity: 1, symbol: '<', test: (v, o) => !isEmpty(v) && /** @type {number} */ (v) < Number(o) },
    lte: { label: 'less than or equal', arity: 1, symbol: '≤', test: (v, o) => !isEmpty(v) && /** @type {number} */ (v) <= Number(o) },
    gt: { label: 'greater than', arity: 1, symbol: '>', test: (v, o) => !isEmpty(v) && /** @type {number} */ (v) > Number(o) },
    gte: { label: 'greater than or equal', arity: 1, symbol: '≥', test: (v, o) => !isEmpty(v) && /** @type {number} */ (v) >= Number(o) },
    between: {
      label: 'between',
      arity: 2,
      symbol: 'between',
      test: (v, o, o2) => !isEmpty(v) && /** @type {number} */ (v) >= Number(o) && /** @type {number} */ (v) <= Number(o2),
    },
    ...emptyOps,
  },
};

/** @type {Map<string, Intl.DateTimeFormat>} */
const dateFormats = new Map();

/**
 * @param {string | undefined} locale
 * @param {Intl.DateTimeFormatOptions | undefined} options
 * @param {boolean} local
 */
const dateFormat = (locale, options, local) => {
  const key = `${locale}|${local}|${JSON.stringify(options ?? {})}`;

  if (!dateFormats.has(key)) {
    /** @type {Intl.DateTimeFormatOptions} */
    const defaults = { dateStyle: 'medium' };

    if (!local) defaults.timeZone = 'UTC';
    dateFormats.set(key, new Intl.DateTimeFormat(locale, { ...defaults, ...options }));
  }

  return /** @type {Intl.DateTimeFormat} */ (dateFormats.get(key));
};

/** @type {ColumnTypeDef} */
const date = {
  editor: 'date',
  compare: (a, b) => toTime(a) - toTime(b),
  // Date objects show their local calendar day; ISO strings their UTC day (no timezone shift).
  format: (v, column = {}, locale) => {
    if (isEmpty(v)) return '';

    return v instanceof Date
      ? dateFormat(locale, column.formatOptions, true).format(v)
      : dateFormat(locale, column.formatOptions, false).format(new Date(toTime(v)));
  },
  parse: (input) => {
    const raw = String(input).trim();

    if (raw === '') return { value: null };
    const m = ISO_DATE.exec(raw);

    if (!m) return { error: 'Enter a date as YYYY-MM-DD.', code: 'dateFormat' };
    const d = new Date(toTime(raw));
    const real = d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);

    return real ? { value: raw } : { error: 'Enter a date as YYYY-MM-DD.', code: 'dateFormat' };
  },
  operators: {
    on: { label: 'on', arity: 1, symbol: 'on', test: (v, o) => !isEmpty(v) && toDay(v) === toDay(o) },
    notOn: { label: 'not on', arity: 1, symbol: 'not on', test: (v, o) => isEmpty(v) || toDay(v) !== toDay(o) },
    before: { label: 'before', arity: 1, symbol: 'before', test: (v, o) => !isEmpty(v) && toDay(v) < toDay(o) },
    after: { label: 'after', arity: 1, symbol: 'after', test: (v, o) => !isEmpty(v) && toDay(v) > toDay(o) },
    between: {
      label: 'between',
      arity: 2,
      symbol: 'between',
      test: (v, o, o2) => !isEmpty(v) && toDay(v) >= toDay(o) && toDay(v) <= toDay(o2),
    },
    ...emptyOps,
  },
};

/** @type {ColumnTypeDef} */
const boolean = {
  editor: 'boolean',
  compare: (a, b) => Number(Boolean(a)) - Number(Boolean(b)),
  format: (v, column = {}) => (isEmpty(v) ? '' : (column.labels ?? ['No', 'Yes'])[v ? 1 : 0]),
  parse: (input) => ({ value: input === '' || input == null ? null : input === true || input === 'true' }),
  operators: {
    isTrue: { label: 'is true', arity: 0, symbol: 'is true', test: (v) => v === true },
    isFalse: { label: 'is false', arity: 0, symbol: 'is false', test: (v) => v === false },
    empty: emptyOps.empty,
  },
};

/**
 * @param {Partial<import('./model.js').Column> | undefined} column
 * @param {unknown} value
 */
const optionIndex = (column, value) => (column?.options ?? []).findIndex((o) => o.value === value);

/** @type {ColumnTypeDef} */
const enumType = {
  editor: 'enum',
  compare: (a, b, column) => optionIndex(column, a) - optionIndex(column, b),
  format: (v, column = {}) => (isEmpty(v) ? '' : ((column.options ?? []).find((o) => o.value === v)?.label ?? String(v))),
  parse: (input) => ({ value: input === '' ? null : input }),
  operators: {
    in: {
      label: 'is any of',
      arity: 'list',
      symbol: 'is',
      test: (v, list) => !Array.isArray(list) || list.length === 0 || list.includes(v),
    },
  },
};

const registry = new Map(Object.entries({ text, number, date, boolean, enum: enumType }));

/**
 * Look up a column type by name.
 * @param {string} name
 * @returns {ColumnTypeDef}
 */
export function getType(name) {
  const type = registry.get(name);

  if (!type) throw new Error(`Unknown column type "${name}". Register it with registerType().`);

  return type;
}

/**
 * Add or replace a column type (for example a currency type built from `number`).
 * @param {string} name
 * @param {ColumnTypeDef} definition
 */
export function registerType(name, definition) {
  registry.set(name, definition);
}
