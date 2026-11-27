/** Check agent input against a form's schema, then set each control the way a person would. */
import { checkboxGroups, isHidden } from './schema.js';

/** @typedef {import('./schema.js').JsonSchema} JsonSchema */
/** @typedef {import('./schema.js').Control} Control */
/** @typedef {import('./schema.js').FieldError} FieldError */

/** @typedef {{ value: string, selected?: boolean }} SelectOption */

/**
 * A control as `set` writes it: native or Focsd, so every property is optional.
 * @typedef {HTMLElement & {
 *   name: string,
 *   type?: string,
 *   value?: string | number,
 *   multiple?: boolean,
 *   options?: Iterable<SelectOption>,
 *   values?: unknown[],
 *   checked?: boolean,
 *   pressed?: boolean,
 *   valueLow?: number,
 *   valueHigh?: number,
 *   valueStart?: unknown,
 *   valueEnd?: unknown,
 *   updateComplete?: Promise<unknown>,
 * }} Writable
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Problems with `input` against `schema`: [{ field, message }]. Empty when it is usable.
 * @param {JsonSchema} schema
 * @param {Record<string, unknown> | null | undefined} input
 * @returns {FieldError[]}
 */
export function check(schema, input) {
  /** @type {FieldError[]} */
  const errors = [];
  /**
   * @param {string} field
   * @param {string} message
   */
  const add = (field, message) => errors.push({ field, message });
  const values = input ?? {};

  for (const field of schema.required ?? []) {
    const v = values[field];

    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) add(field, 'Required.');
  }

  for (const [field, v] of Object.entries(values)) {
    const s = schema.properties && Object.hasOwn(schema.properties, field) ? schema.properties[field] : null;

    if (!s) {
      add(field, 'Not a field of this form.');
      continue;
    }

    if (v === undefined || v === null || v === '') continue;
    checkValue(s, v, (message) => add(field, message));
  }

  return errors;
}

/**
 * A check for one schema type: the problem with `v`, or undefined. Nested values report through `fail`.
 * @typedef {(s: JsonSchema, v: unknown, fail: (message: string) => void) => string | undefined} Check
 */

/** @type {Check} */
function checkArray(s, v, fail) {
  if (!Array.isArray(v)) return 'Expected a list.';

  if (s.minItems !== undefined && v.length < s.minItems) return `Expected at least ${s.minItems} values.`;

  if (s.maxItems !== undefined && v.length > s.maxItems) return `At most ${s.maxItems} values.`;

  for (const item of v) checkValue(s.items ?? {}, item, fail);

  return undefined;
}

/**
 * Whether a nested object has `key`: 0, false and '' are values; only an absent key or null is missing.
 * @param {Record<string, unknown>} obj
 * @param {string} key
 */
const hasKey = (obj, key) => Object.hasOwn(obj, key) && obj[key] !== undefined && obj[key] !== null;

/** @type {Check} */
function checkObject(s, v, fail) {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return 'Expected an object.';
  const obj = /** @type {Record<string, unknown>} */ (v);

  for (const key of s.required ?? []) if (!hasKey(obj, key)) return `Missing ${key}.`;

  for (const [key, sub] of Object.entries(s.properties ?? {})) if (obj[key] !== undefined) checkValue(sub, obj[key], fail);

  return undefined;
}

/** @type {Check} */
function checkNumber(s, v) {
  const n = Number(v);

  if (!Number.isFinite(n)) return 'Expected a number.';

  if (s.type === 'integer' && !Number.isInteger(n)) return 'Expected a whole number.';

  if (s.minimum !== undefined && n < s.minimum) return `At least ${s.minimum}.`;

  if (s.maximum !== undefined && n > s.maximum) return `At most ${s.maximum}.`;

  return undefined;
}

/** @type {Check} */
function checkString(s, v) {
  if (typeof v !== 'string' && typeof v !== 'number') return 'Expected text.';
  const t = String(v);

  if (s.enum && !s.enum.includes(t)) return `One of: ${s.enum.join(', ')}.`;

  if (s.format === 'email' && !EMAIL.test(t)) return 'Expected an email address.';

  if (s.format === 'date' && !DATE.test(t)) return 'Expected a date as YYYY-MM-DD.';

  if (s.pattern && !matches(s.pattern, t)) return `Expected the format ${s.pattern}.`;

  if (s.minLength !== undefined && t.length < s.minLength) return `At least ${s.minLength} characters.`;

  if (s.maxLength !== undefined && t.length > s.maxLength) return `At most ${s.maxLength} characters.`;

  return undefined;
}

/** @type {Record<string, Check>} */
const CHECKS = {
  array: checkArray,
  object: checkObject,
  boolean: (s, v) => (typeof v === 'boolean' ? undefined : 'Expected true or false.'),
  number: checkNumber,
  integer: checkNumber,
  string: checkString,
};

/**
 * @param {JsonSchema} s
 * @param {unknown} v
 * @param {(message: string) => void} fail
 * @returns {void}
 */
function checkValue(s, v, fail) {
  const checker = s.type && Object.hasOwn(CHECKS, s.type) ? CHECKS[s.type] : undefined;
  const message = checker?.(s, v, fail);

  if (message) fail(message);
}

/**
 * @param {string} pattern
 * @param {string} text
 */
function matches(pattern, text) {
  try {
    return new RegExp(pattern, 'v').test(text);
  } catch {
    // An invalid pattern counts as a match: browsers ignore a `pattern` they cannot compile, so
    // the check accepts what the form itself would accept.
    return true;
  }
}

/**
 * Write a native property through the prototype's setter. Frameworks such as React put their own
 * value tracker on the element; writing through it would hide the change from them.
 * @param {object} el
 * @param {'checked' | 'value'} prop
 * @param {unknown} value
 */
function setNative(el, prop, value) {
  for (let proto = Object.getPrototypeOf(el); proto; proto = Object.getPrototypeOf(proto)) {
    const setter = Object.getOwnPropertyDescriptor(proto, prop)?.set;

    if (setter) {
      setter.call(el, value);

      return;
    }
  }

  /** @type {Record<string, unknown>} */ (el)[prop] = value;
}

/** Controls whose list value is written comma-separated, and native controls written through `setNative`. */
const JOINED = new Set(['focsd-combobox', 'focsd-multi-select', 'focsd-toggle-group']);
const NATIVE = new Set(['input', 'select', 'textarea']);

/** Controls whose list value is written through `values`. */
const VALUES = new Set(['focsd-tag-input', 'focsd-listbox']);

/**
 * Write a list: comma-joined into `value`, or as `values`.
 * @param {Writable} el
 * @param {string} tag
 * @param {unknown[]} list
 */
function setList(el, tag, list) {
  if (VALUES.has(tag)) el.values = list;
  else el.value = list.join(',');
}

/**
 * Set one control's value from agent input, then fire the events a person's edit fires.
 * @param {Writable} el
 * @param {unknown} v
 */
async function set(el, v) {
  const tag = el.localName;
  // Input already checked against the schema: a list for multiple selects, { start, end } for a date range.
  const list = /** @type {unknown[]} */ (v);
  const range = /** @type {{ start?: unknown, end?: unknown }} */ (v);

  if ((tag === 'focsd-select' || tag === 'select') && el.multiple)
    for (const o of /** @type {Iterable<SelectOption>} */ (el.options)) o.selected = list.includes(o.value);
  else if (Array.isArray(v) && (JOINED.has(tag) || VALUES.has(tag))) setList(el, tag, v);
  else if (tag === 'focsd-checkbox' || tag === 'focsd-switch') el.checked = Boolean(v);
  else if (tag === 'focsd-toggle') el.pressed = Boolean(v);
  else if (tag === 'focsd-slider' && Array.isArray(v)) Object.assign(el, { valueLow: Number(v[0]), valueHigh: Number(v[1]) });
  else if (tag === 'focsd-slider' || tag === 'focsd-rating') el.value = Number(v);
  else if (tag === 'focsd-date-range-picker') Object.assign(el, { valueStart: range.start, valueEnd: range.end });
  else if (tag === 'input' && el.type === 'checkbox') setNative(el, 'checked', Boolean(v));
  else if (NATIVE.has(tag)) setNative(el, 'value', String(v));
  else el.value = String(v);
  el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  await el.updateComplete;
}

/**
 * Fill `form` with the agent's `input` (only the fields given).
 * @param {HTMLFormElement} form
 * @param {Record<string, unknown> | null | undefined} input
 * @returns {Promise<void>}
 */
export async function fill(form, input) {
  const groups = checkboxGroups(form);

  for (const [name, value] of Object.entries(input ?? {})) {
    if (groups.has(name) && Array.isArray(value)) {
      for (const el of /** @type {Control[]} */ (groups.get(name))) await set(el, value.includes(el.value));
      continue;
    }

    const radios = /** @type {Control[]} */ ([...form.elements]).filter(
      (el) => el.localName === 'input' && el.type === 'radio' && el.name === name && !el.disabled,
    );

    const [first] = radios;

    if (first) {
      for (const r of radios) setNative(r, 'checked', r.value === value);
      first.dispatchEvent(new Event('change', { bubbles: true }));
      continue;
    }

    // Only the control the schema describes: never a hidden, read-only or disabled one with the same name.
    const el = /** @type {Control[]} */ ([...form.elements]).find((e) => e.name === name && !isHidden(e));

    if (el) await set(el, value);
  }
}
