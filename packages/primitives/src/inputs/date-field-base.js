import { css, html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { FormControlMixin, restoredText } from '../internal/form-control.js';
import { uid } from '../internal/id.js';
import { renderFieldLayout } from '../internal/field-messages.js';
import { parseISODate, toISODate, todayUTC } from '../internal/date.js';
import { asciiDigits, daysInMonth, stepSegment, swallowEditKey, typeDigit } from '../internal/segments.js';

/** @typedef {'day' | 'month' | 'year'} DateSegment */
/** @typedef {{ type: DateSegment, index: number } | { type: 'literal', value: string }} DatePart */
/** @typedef {{ type: DateSegment, text: string }} PendingDigits */

/** @type {Record<DateSegment, import('../internal/segments.js').SegmentRange>} */
const RANGES = { day: { min: 1, max: 31, length: 2 }, month: { min: 1, max: 12, length: 2 }, year: { min: 1, max: 9999, length: 4 } };
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const STATE = /^(\d*),(\d*),(\d*)$/;
const ISO_STATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** @type {Intl.DateTimeFormatOptions} */
const LAYOUT_OPTIONS = { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' };

const pad = (/** @type {number} */ n, /** @type {number} */ size) => String(n).padStart(size, '0');

/** @type {Map<string, DatePart[]>} */
const layouts = new Map();

/**
 * The locale's day, month and year order, with its separators.
 * @param {string} locale
 * @returns {DatePart[]}
 */
const dateLayout = (locale) => {
  const cached = layouts.get(locale);

  if (cached) return cached;
  let parts;

  try {
    const format = new Intl.DateTimeFormat(locale || undefined, { ...LAYOUT_OPTIONS, calendar: 'gregory', numberingSystem: 'latn' });
    parts = format.formatToParts(Date.UTC(2026, 9, 15));
  } catch {
    parts = new Intl.DateTimeFormat('en-US', LAYOUT_OPTIONS).formatToParts(0);
  }

  let index = 0;

  /** @type {DatePart[]} */
  const layout = parts.flatMap((p) => {
    /** @type {DatePart[]} */
    const part =
      p.type === 'day' || p.type === 'month' || p.type === 'year'
        ? [{ type: p.type, index: index++ }]
        : p.type === 'literal'
          ? [{ type: 'literal', value: p.value }]
          : [];

    return part;
  });

  layouts.set(locale, layout);

  return layout;
};

/**
 * Segmented date field: a labeled group of day, month and year spinbutton segments in the locale's
 * order. Up/Down step, typed digits set the segment and auto-advance, Left/Right move between segments,
 * and a pasted ISO or locale date fills every segment. Form value `YYYY-MM-DD`. A pasted date counts
 * only as digits (`2026-10-15`, or `15/10/2026` in the locale's order, with a four-digit year): a
 * date with a month name, such as "Oct 15, 2026", is ignored. Backspace on an empty segment moves to
 * the previous one; setting `value` from code always refills the segments, so `''` clears a
 * half-typed date.
 *
 * @fires input - Fired on every user edit of the value.
 * @fires change - Fired when the user commits a change to the value or state.
 * @csspart field - The group that holds the segments.
 * @csspart segment - Each day, month or year segment (also `day`, `month` or `year`).
 * @csspart literal - The separators between segments.
 * @csspart label - The label element.
 * @csspart layout - The wrapper that places the label beside or above the body.
 * @csspart body - The field, hint and message.
 * @csspart hint - The author's hint.
 * @csspart message - The shown error, warning or success message (also `error`, `warning` or `success`).
 * @csspart message-icon - The message's icon.
 * @csspart announcer - The visually hidden status region.
 */
export class FocsdDateFieldBase extends FormControlMixin(FocsdElement) {
  /** `readonly` applies here (no edits, barred from validation), as on native text-like inputs. */
  static supportsReadOnly = true;

  /** @override */
  static shadowRootOptions = { ...FocsdElement.shadowRootOptions, delegatesFocus: true };

  // Segments follow the locale's order, so arrows move in reading order of the LTR digits.
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdElement.styles, css`[part~='field'] { direction: ltr; unicode-bidi: isolate; }`];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    label: {},
    // Own accessor (below): a write from code always refills the segments.
    value: { noAccessor: true },
    min: {},
    max: {},
    locale: {},
    _day: { state: true },
    _month: { state: true },
    _year: { state: true },
    _pending: { state: true },
  };

  #labelId = uid('focsd-date-label');

  /** Digits typed into the focused segment that are not committed yet. */
  #buffer = '';

  #value = '';

  /** True while the field itself writes `value` (a write from code refills the segments). */
  #writing = false;

  /** True after a write from code, until willUpdate refills the segments. */
  #refill = false;

  /** The date as `YYYY-MM-DD`, or an empty string while the date is empty, incomplete or not real. */
  get value() {
    return this.#value;
  }
  set value(next) {
    const old = this.#value;
    this.#value = next;

    if (!this.#writing) this.#refill = true;
    this.requestUpdate('value', old);

    // Unchanged ('' over a half-typed date): Lit skips the update, but the segments still refill.
    if (!this.#writing && next === old) this.requestUpdate();
  }

  /** @param {string} next */
  #write(next) {
    this.#writing = true;
    this.value = next;
    this.#writing = false;
  }

  constructor() {
    super();
    /** The visible label. */
    this.label = '';
    /** Earliest allowed date (`YYYY-MM-DD`). */
    this.min = '';
    /** Latest allowed date (`YYYY-MM-DD`). */
    this.max = '';
    /** BCP 47 locale for segment order and names; empty uses the page language. */
    this.locale = '';
    /** @internal */
    this._day = /** @type {number | null} */ (null);
    /** @internal */
    this._month = /** @type {number | null} */ (null);
    /** @internal */
    this._year = /** @type {number | null} */ (null);
    // The segment showing uncommitted digits (a leading 0, or a year still being typed), and those digits.
    /** @internal */
    this._pending = /** @type {PendingDigits | null} */ (null);
  }

  /** `YYYY-MM-DD` for the three segments, or '' when one is empty. */
  get #composed() {
    const { _day: d, _month: m, _year: y } = this;

    return d === null || m === null || y === null ? '' : `${pad(y, 4)}-${pad(m, 2)}-${pad(d, 2)}`;
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  willUpdate(changed) {
    const refill = this.#refill;
    this.#refill = false;

    if (refill || (changed.has('value') && this.value !== this.#real)) {
      // Like a native date input, a value that is not a real date is dropped (never shifted).
      const date = parseISODate(this.value);
      this.#buffer = '';
      this.#fill(date ? date.getUTCDate() : null, date ? date.getUTCMonth() + 1 : null, date ? date.getUTCFullYear() : null);
      this.#write(date ? this.value : '');
    }
  }

  /** The composed date when it is real, else ''. */
  get #real() {
    return parseISODate(this.#composed) ? this.#composed : '';
  }

  /** @override */
  updated() {
    this.internals.setFormValue(this.value || null, [this._day, this._month, this._year].map((n) => n ?? '').join(','));
    this.#validate();
  }

  #validate() {
    const first = this.renderRoot.querySelector('[role="spinbutton"]');
    const filled = [this._day, this._month, this._year].filter((n) => n !== null).length;
    const iso = (/** @type {string} */ text) => (parseISODate(text) ? text : '');

    if (filled === 0 && this.required) this.setValidityState({ valueMissing: true }, this.localize.term('enterDate'), first);
    else if (filled > 0 && filled < 3) this.setValidityState({ badInput: true }, this.localize.term('enterCompleteDate'), first);
    else if (filled === 3 && !this.value) this.setValidityState({ badInput: true }, this.localize.term('enterRealDate'), first);
    else if (this.value && iso(this.min) && this.value < this.min)
      this.setValidityState({ rangeUnderflow: true }, this.localize.term('dateMin', this.min), first);
    else if (this.value && iso(this.max) && this.value > this.max)
      this.setValidityState({ rangeOverflow: true }, this.localize.term('dateMax', this.max), first);
    else this.setValidityState({});
  }

  /** The date as a Date at UTC midnight, or null. */
  get valueAsDate() {
    return parseISODate(this.value);
  }
  set valueAsDate(date) {
    this.value = date instanceof Date && !Number.isNaN(date.getTime()) ? toISODate(date) : '';
  }

  /** @param {string | File | FormData | null} state */
  formStateRestoreCallback(state) {
    const text = restoredText(state) ?? '';
    const iso = ISO_STATE.exec(text);
    const match = iso ? [text, iso[3], iso[2], iso[1]] : STATE.exec(text);

    // A restored number outside its segment's range is dropped, not clamped.
    const num = (/** @type {string | undefined} */ group, /** @type {DateSegment} */ type) => {
      const n = group ? Number(group) : null;

      return n !== null && n >= RANGES[type].min && n <= RANGES[type].max ? n : null;
    };

    if (match) this.#fill(num(match[1], 'day'), num(match[2], 'month'), num(match[3], 'year'));
  }

  formResetCallback() {
    // Always refill: with the value unchanged, willUpdate would leave uncommitted digits behind.
    const date = parseISODate(this.defaultValue);
    this.#buffer = '';
    this.#fill(date ? date.getUTCDate() : null, date ? date.getUTCMonth() + 1 : null, date ? date.getUTCFullYear() : null);
  }

  /**
   * Set all three segments and the value they make, without events.
   * @param {number | null} day
   * @param {number | null} month
   * @param {number | null} year
   */
  #fill(day, month, year) {
    this._day = day;
    this._month = month;
    this._year = year;
    this._pending = null;
    this.#write(this.#real);
  }

  /**
   * Commit one segment and fire `input` and `change`.
   * @param {DateSegment} type
   * @param {number | null} n
   */
  #set(type, n) {
    if (type === 'day') this._day = n;
    else if (type === 'month') this._month = n;
    else this._year = n;
    this._pending = null;
    this.#write(this.#real);
    this.emitValue();
  }

  /** @param {DateSegment} type */
  #get(type) {
    return type === 'day' ? this._day : type === 'month' ? this._month : this._year;
  }

  #segments() {
    return /** @type {HTMLElement[]} */ ([...this.renderRoot.querySelectorAll('[role="spinbutton"]')]);
  }

  /** @param {number} index */
  #focusSegment(index) {
    this.#buffer = '';
    this.#segments()[index]?.focus();
  }

  /** The segment type at `index` in the current locale. */
  #typeAt(/** @type {number} */ index) {
    const part = this.#layout.find((p) => p.type !== 'literal' && p.index === index);

    return part && part.type !== 'literal' ? part.type : null;
  }

  /**
   * Type a digit. Day and month commit on every keystroke the engine gives a value for; the year commits
   * only once its four digits are in, so no partial year (`0002`) is ever emitted.
   * @param {DateSegment} type
   * @param {number} index
   * @param {number} digit
   */
  #type(type, index, digit) {
    const { value, buffer, advance, carry } = typeDigit(this.#buffer, digit, RANGES[type]);

    // Only zeros (`00`): no day or month. The segment clears, focus stays and nothing carries on.
    if (value === null && carry !== undefined && /^0+$/.test(this.#buffer + carry)) {
      this.#buffer = '';
      this.#set(type, null);

      return;
    }

    const final = advance || (value !== null && type !== 'year');

    // Final but below min (`00`): not a day or month, so the segment clears and the 0 moves on.
    if (final) this.#set(type, value);
    else this._pending = { type, text: buffer };
    this.#buffer = buffer;

    if (!advance) return;
    this.#focusSegment(index + 1);
    const next = this.#typeAt(index + 1);

    if (carry !== undefined && next) this.#type(next, index + 1, carry);
  }

  /**
   * Leaving a segment with uncommitted digits clears it: a half-typed year is never read as a short one.
   * A window or tab switch blurs the segment but leaves it active: then the digits stay for the return.
   * @param {DateSegment} type
   * @param {FocusEvent} event
   */
  #onBlur(type, event) {
    if (!document.hasFocus() || /** @type {ShadowRoot} */ (this.renderRoot).activeElement === event.target) return;
    const left = this._pending?.type === type;
    this.#buffer = '';

    if (left) this.#set(type, null);
  }

  /**
   * @param {DateSegment} type
   * @param {number} delta
   */
  #step(type, delta) {
    const { min } = RANGES[type];
    // A day steps within its month when the month is known (February 29 only in a leap or unknown year).
    const max = type === 'day' && this._month !== null ? daysInMonth(this._month, this._year) : RANGES[type].max;
    const current = this.#get(type);
    // An empty year starts from this year, as native date inputs do, not from year 1 or 9999.
    const from = current === null && type === 'year' ? todayUTC().getUTCFullYear() - delta : current;
    this.#buffer = '';
    this.#set(type, stepSegment(from, delta, min, max));
  }

  /**
   * @param {DateSegment} type
   * @param {number} index
   * @param {KeyboardEvent} event
   */
  #onKeyDown(type, index, event) {
    if (this.isDisabled) return;
    const key = asciiDigits(event.key);

    if (this.readOnly) {
      swallowEditKey(event, key);

      return;
    }

    if (key === 'ArrowUp' || key === 'ArrowDown') this.#step(type, key === 'ArrowUp' ? 1 : -1);
    else if (key === 'ArrowRight' || key === 'ArrowLeft') this.#focusSegment(index + (key === 'ArrowRight' ? 1 : -1));
    else if (key === 'Backspace' && this.#get(type) === null && !this._pending) this.#focusSegment(index - 1);
    else if (key === 'Backspace' || key === 'Delete') {
      this.#buffer = '';
      this.#set(type, null);
    } else if (/^\d$/.test(key)) this.#type(type, index, Number(key));
    else return;
    event.preventDefault();
  }

  /**
   * Paste an ISO date, or day, month and year groups in the locale's order. Anything else, or a year
   * shorter than four digits, leaves the field unchanged.
   * @param {ClipboardEvent} event
   */
  #onPaste(event) {
    event.preventDefault();

    if (this.isDisabled || this.readOnly) return;
    const text = asciiDigits(event.clipboardData?.getData('text/plain') ?? '').trim();
    const groups = ISO.test(text) ? text.split('-') : text.split(/\D+/).filter(Boolean);
    const order = ISO.test(text) ? ['year', 'month', 'day'] : this.#layout.flatMap((p) => (p.type === 'literal' ? [] : [p.type]));
    /** @type {Record<string, number>} */
    const got = {};

    for (const [i, type] of order.entries()) {
      const { min, max, length } = RANGES[/** @type {DateSegment} */ (type)];
      const group = groups[i] ?? '';
      const n = Number(group);
      const fits = type === 'year' ? group.length === 4 : group.length > 0 && group.length <= length;

      if (groups.length !== 3 || !fits || n < min || n > max) return;
      got[type] = n;
    }

    this.#buffer = '';
    this.#fill(/** @type {number} */ (got.day), /** @type {number} */ (got.month), /** @type {number} */ (got.year));
    this.emitValue();
  }

  /** `locale`, else the nearest `lang`, else the browser's. */
  get #locale() {
    return this.locale || this.localize.locale();
  }

  get #layout() {
    return dateLayout(this.#locale ?? '');
  }

  /** @param {number} month */
  #monthName(month) {
    try {
      return new Intl.DateTimeFormat(this.#locale, { month: 'long', calendar: 'gregory', timeZone: 'UTC' }).format(
        Date.UTC(2026, month - 1, 1),
      );
    } catch {
      return String(month);
    }
  }

  /**
   * @param {DateSegment} type
   * @param {number} index
   */
  #segment(type, index) {
    const now = this.#get(type);
    const { min, max, length } = RANGES[type];
    const pending = this._pending?.type === type ? this._pending.text : null;
    const text = pending ?? (now === null ? null : pad(now, length));
    const spoken = pending ?? (now === null ? null : type === 'month' ? this.#monthName(now) : String(now));

    return html`<span
      part="segment ${type}"
      role="spinbutton"
      tabindex=${this.isDisabled ? '-1' : '0'}
      aria-label=${this.localize.term(type)}
      aria-valuenow=${pending === null ? (now ?? nothing) : nothing}
      aria-valuemin=${min}
      aria-valuemax=${max}
      aria-valuetext=${spoken ?? this.localize.term('empty')}
      ?data-empty=${text === null}
      aria-disabled=${this.isDisabled ? 'true' : nothing}
      aria-readonly=${this.readOnly ? 'true' : nothing}
      @keydown=${(/** @type {KeyboardEvent} */ e) => this.#onKeyDown(type, index, e)}
      @paste=${(/** @type {ClipboardEvent} */ e) => this.#onPaste(e)}
      @blur=${(/** @type {FocusEvent} */ e) => this.#onBlur(type, e)}
    >${text ?? '–'.repeat(length)}</span>`;
  }

  /** @override */
  render() {
    /* eslint-disable lit-a11y/click-events-have-key-events -- the label is a pointer convenience; the segments are keyboard-operable */
    const label = html`<span part="label" id=${this.#labelId} @click=${() => this.#focusSegment(0)}>${this.label}</span>`;
    /* eslint-enable lit-a11y/click-events-have-key-events */
    const ids = this.describedByIds().join(' ');

    const parts = this.#layout.map((p) =>
      p.type === 'literal' ? html`<span part="literal" aria-hidden="true">${p.value}</span>` : this.#segment(p.type, p.index),
    );

    return renderFieldLayout(
      this,
      label,
      html`<div part="field" role="group" aria-labelledby=${this.#labelId} aria-describedby=${ids || nothing} ?data-disabled=${this.isDisabled}>
        ${parts}
      </div>`,
    );
  }
}
