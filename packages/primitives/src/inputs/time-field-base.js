import { css, html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { FormControlMixin, restoredText } from '../internal/form-control.js';
import { uid } from '../internal/id.js';
import { renderFieldLayout } from '../internal/field-messages.js';
import { DAY } from '../internal/date.js';
import { asciiDigits, stepSegment, swallowEditKey, typeDigit } from '../internal/segments.js';

/** @typedef {'hour' | 'minute' | 'period'} SegmentKind */
/** @typedef {{ now: number | null, min: number, max: number, text: string | null }} SegmentSpec */

const pad = (/** @type {number} */ n) => String(n).padStart(2, '0');
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MINUTE = 60_000;

/** Minutes since midnight for `HH:MM`, else NaN. */
const toMinutes = (/** @type {string | null | undefined} */ text) => {
  const match = TIME.exec(text ?? '');

  return match ? Number(match[1]) * 60 + Number(match[2]) : NaN;
};

const fromMinutes = (/** @type {number} */ minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/** `h12` or `h23` from the locale's preferred hour cycle. */
const localeHourCycle = (/** @type {string | null | undefined} */ locale) => {
  try {
    const cycle = new Intl.DateTimeFormat(locale || undefined, { hour: 'numeric' }).resolvedOptions().hourCycle;

    return cycle === 'h12' || cycle === 'h11' ? 'h12' : 'h23';
  } catch {
    return 'h23';
  }
};

/**
 * Segmented time field: a labeled group of spinbutton segments (hours, minutes, AM/PM in h12).
 * Up/Down step, typed digits set the segment and auto-advance, Left/Right move between segments.
 * Form value `HH:MM` (24-hour).
 *
 * @fires input - Fired on every user edit of the value.
 * @fires change - Fired when the user commits a change to the value or state.
 * @csspart divider - The ":" between hours and minutes.
 * @csspart field - The field element.
 * @csspart label - The label element.
 * @csspart layout - The wrapper that places the label beside or above the body.
 * @csspart body - The field, hint and message.
 * @csspart hint - The author's hint.
 * @csspart message - The shown error, warning or success message (also `error`, `warning` or `success`).
 * @csspart message-icon - The message's icon.
 * @csspart announcer - The visually hidden status region.
 * @csspart segment - Each hour, minute or AM/PM segment.
 */
export class FocsdTimeFieldBase extends FormControlMixin(FocsdElement) {
  /** `readonly` applies here (no edits, barred from validation), as on native text-like inputs. */
  static supportsReadOnly = true;

  /** @override */
  static shadowRootOptions = { ...FocsdElement.shadowRootOptions, delegatesFocus: true };

  // Times read hours-then-minutes left to right in every script, so segments (and arrows) stay LTR.
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdElement.styles, css`[part~='field'] { direction: ltr; unicode-bidi: isolate; }`];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    label: {},
    value: {},
    hourCycle: { attribute: 'hour-cycle' },
    step: { type: Number },
    min: {},
    max: {},
    locale: {},
    _hour: { state: true },
    _minute: { state: true },
    _pm: { state: true },
  };

  #labelId = uid('focsd-time-label');

  /** First digit typed into the focused segment, waiting for a second. */
  #buffer = '';

  constructor() {
    super();
    /** The visible label. */
    this.label = '';
    /** The time, `HH:MM` (24-hour). */
    this.value = '';
    /** @type {'' | 'h12' | 'h23'} `h12` (with AM/PM) or `h23`; empty follows the locale. */
    this.hourCycle = '';
    /** The minutes the arrow keys add or subtract. */
    this.step = 1;
    /** Earliest and latest allowed times (`HH:MM`). */
    this.min = '';
    /** The latest time allowed, `HH:MM`. */
    this.max = '';
    /** A BCP 47 locale tag for the hour cycle and AM/PM names; defaults to the page's language. */
    this.locale = '';
    /** @type {number | null} */
    this._hour = null;
    /** @type {number | null} */
    this._minute = null;
    this._pm = false;
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
  }

  /**
   * The hour cycle in use: `hour-cycle`, or the locale's.
   * @returns {'h12' | 'h23'}
   */
  get cycle() {
    return this.hourCycle === 'h12' || this.hourCycle === 'h23' ? this.hourCycle : localeHourCycle(this.#locale);
  }

  get #composed() {
    return this._hour === null || this._minute === null ? '' : `${pad(this._hour)}:${pad(this._minute)}`;
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  willUpdate(changed) {
    if (changed.has('value') && this.value !== this.#composed) {
      const match = TIME.exec(this.value ?? '');
      this._hour = match ? Number(match[1]) : null;
      this._minute = match ? Number(match[2]) : null;

      if (match) this._pm = /** @type {number} */ (this._hour) >= 12;
    }
  }

  /** @override */
  updated() {
    this.internals.setFormValue(this.value || null, this.value);
    const first = this.renderRoot.querySelector('[role="spinbutton"]');
    const partial = (this._hour === null) !== (this._minute === null);

    if (partial) this.setValidityState({ badInput: true }, this.localize.term('enterCompleteTime'), first);
    else if (this.required && !this.value) this.setValidityState({ valueMissing: true }, this.localize.term('enterTime'), first);
    else if (this.value && this.#wraps && this.value > this.max && this.value < this.min)
      // min after max is an overnight range (22:00–06:00): outside it is both under and over, as native.
      this.setValidityState({ rangeUnderflow: true, rangeOverflow: true }, this.localize.term('timeBetween', this.min, this.max), first);
    else if (this.value && !this.#wraps && this.value < (TIME.test(this.min) ? this.min : '00:00'))
      this.setValidityState({ rangeUnderflow: true }, this.localize.term('timeMin', this.min), first);
    else if (this.value && !this.#wraps && this.value > (TIME.test(this.max) ? this.max : '23:59'))
      this.setValidityState({ rangeOverflow: true }, this.localize.term('timeMax', this.max), first);
    else this.setValidityState({});
  }

  get #wraps() {
    return TIME.test(this.min) && TIME.test(this.max) && this.min > this.max;
  }

  /** The time as a Date on 1970-01-01 UTC, or null, like native time inputs. */
  get valueAsDate() {
    const minutes = toMinutes(this.value);

    return Number.isNaN(minutes) ? null : new Date(minutes * MINUTE);
  }
  set valueAsDate(date) {
    this.valueAsNumber = date instanceof Date ? date.getTime() : NaN;
  }

  /** Milliseconds since midnight, or NaN when empty. */
  get valueAsNumber() {
    return toMinutes(this.value) * MINUTE;
  }
  set valueAsNumber(ms) {
    this.value = Number.isFinite(ms) ? fromMinutes(Math.floor((((ms % DAY) + DAY) % DAY) / MINUTE)) : '';
  }

  /** Move by `n` steps of `step` minutes, clamped to `min`/`max`. Fires no events, like native. */
  stepUp(n = 1) {
    const step = Math.max(1, Number(this.step) || 1);
    const lo = TIME.test(this.min) ? toMinutes(this.min) : 0;
    const hi = TIME.test(this.max) ? toMinutes(this.max) : 23 * 60 + 59;
    const current = toMinutes(this.value);
    const next = (Number.isNaN(current) ? 0 : current) + n * step;
    this.value = fromMinutes(Math.min(hi, Math.max(lo, next)));
  }

  /** Move back by `n` steps of `step` minutes, clamped to `min`/`max`. Fires no events, like native. */
  stepDown(n = 1) {
    this.stepUp(-n);
  }

  /** @param {string | File | FormData | null} state */
  formStateRestoreCallback(state) {
    this.value = restoredText(state) ?? '';
  }

  formResetCallback() {
    this.value = this.defaultValue;

    if (!this.value) {
      this._hour = null;
      this._minute = null;
    }
  }

  /**
   * @param {number | null} hour
   * @param {number | null} minute
   */
  #set(hour, minute) {
    this._hour = hour;
    this._minute = minute;

    if (hour !== null) this._pm = hour >= 12;
    this.value = this.#composed;
    this.emitValue();
  }

  #segments() {
    return [...this.renderRoot.querySelectorAll('[role="spinbutton"]')];
  }

  /** @param {number} index */
  #focusSegment(index) {
    this.#buffer = '';
    /** @type {HTMLElement} */ (this.#segments()[index])?.focus();
  }

  /**
   * Hour from a 12-hour display value and the current period.
   * @param {number} display
   */
  #from12(display) {
    return (display % 12) + (this._pm ? 12 : 0);
  }

  /** @param {number} delta */
  #stepHour(delta) {
    if (this.cycle === 'h12')
      this.#set(this.#from12(stepSegment(this._hour === null ? null : this._hour % 12 || 12, delta, 1, 12)), this._minute);
    else this.#set(stepSegment(this._hour, delta, 0, 23), this._minute);
  }

  /** @param {number} delta */
  #stepMinute(delta) {
    const step = Math.max(1, Number(this.step) || 1);

    // A step that does not divide the hour (25 min) walks the day's valid times, carrying into the hour.
    if (60 % step !== 0 && this._hour !== null && this._minute !== null) {
      const total = (this._hour * 60 + this._minute + delta * step + 1440) % 1440;
      this.#set(Math.floor(total / 60), total % 60);

      return;
    }

    // From empty, Down lands on the last step of the hour (:45 for 15), not :59.
    this.#set(this._hour, this._minute === null && delta < 0 ? 60 - step : stepSegment(this._minute, delta * step, 0, 59));
  }

  /** @param {boolean} pm */
  #setPeriod(pm) {
    this._pm = pm;

    if (this._hour !== null) this.#set((this._hour % 12) + (pm ? 12 : 0), this._minute);
  }

  /**
   * Typed digit into hours: commit and advance once no second digit could follow; a digit that does not
   * fit (25, or 13 on a 12-hour clock) keeps the first one and starts the minutes.
   * @param {number} digit
   * @param {number} index
   */
  #typeHour(digit, index) {
    const h12 = this.cycle === 'h12';

    const { value, buffer, advance, carry } = typeDigit(
      this.#buffer,
      digit,
      h12 ? { min: 1, max: 12, length: 2 } : { min: 0, max: 23, length: 2 },
    );

    // A lone 0 on a 12-hour clock waits for its second digit; "00" there reads as 12.
    // The h23 cast is safe: with min 0, typeDigit never returns a null value.
    if (value !== null || carry !== undefined) this.#set(h12 ? this.#from12(value ?? 0) : /** @type {number} */ (value), this._minute);
    this.#buffer = buffer;

    if (advance) this.#focusSegment(index + 1);

    if (carry !== undefined) this.#typeMinute(carry, index + 1);
  }

  /**
   * @param {number} digit
   * @param {number} index
   */
  #typeMinute(digit, index) {
    const { value, buffer, advance } = typeDigit(this.#buffer, digit, { min: 0, max: 59, length: 2 });
    this.#set(this._hour, value);
    this.#buffer = buffer;

    if (advance) this.#focusSegment(index + 1);
  }

  /**
   * Leaving a segment drops a half-typed digit, so the next segment starts fresh. A window or tab
   * switch blurs the segment but leaves it active: then the digit stays for the return (as the date field).
   * @param {FocusEvent} event
   */
  #onBlur(event) {
    if (!document.hasFocus() || /** @type {ShadowRoot} */ (this.renderRoot).activeElement === event.target) return;
    this.#buffer = '';
  }

  /**
   * @param {SegmentKind} kind
   * @param {number} index
   * @param {KeyboardEvent} event
   */
  #onKeyDown(kind, index, event) {
    if (this.isDisabled) return;
    const key = asciiDigits(event.key);

    if (this.readOnly) {
      swallowEditKey(event, key, 'apAP');

      return;
    }

    const step = /** @type {Record<string, number | undefined>} */ ({ ArrowUp: 1, ArrowDown: -1 })[key];

    if (step) {
      this.#buffer = '';

      if (kind === 'hour') this.#stepHour(step);
      else if (kind === 'minute') this.#stepMinute(step);
      else this.#setPeriod(!this._pm);
    } else if (key === 'ArrowRight' || key === 'ArrowLeft') this.#focusSegment(index + (key === 'ArrowRight' ? 1 : -1));
    else if (key === 'Backspace' || key === 'Delete') {
      this.#buffer = '';

      if (kind === 'hour') this.#set(null, this._minute);
      else if (kind === 'minute') this.#set(this._hour, null);
    } else if (/^\d$/.test(key) && kind !== 'period') {
      if (kind === 'hour') this.#typeHour(Number(key), index);
      else this.#typeMinute(Number(key), index);
    } else if (kind === 'period' && /^[ap]$/i.test(key)) this.#setPeriod(key.toLowerCase() === 'p');
    else return;
    event.preventDefault();
  }

  /** `locale`, else the nearest `lang`, else the browser's. */
  get #locale() {
    return this.locale || this.localize.locale();
  }

  /**
   * The locale's own words for AM and PM ("vorm."/"nachm.", "午前"/"午後").
   * @param {boolean} pm
   */
  #periodText(pm) {
    try {
      const parts = new Intl.DateTimeFormat(this.#locale, { hour: 'numeric', hourCycle: 'h12', timeZone: 'UTC' }).formatToParts(
        new Date(Date.UTC(2024, 0, 1, pm ? 15 : 3)),
      );

      return parts.find((p) => p.type === 'dayPeriod')?.value ?? (pm ? 'PM' : 'AM');
    } catch {
      return pm ? 'PM' : 'AM';
    }
  }

  /**
   * @param {SegmentKind} kind
   * @param {number} index
   * @param {string} name
   * @param {SegmentSpec} spec
   */
  #segment(kind, index, name, { now, min, max, text }) {
    return html`<span
      part="segment ${kind}"
      role="spinbutton"
      tabindex=${this.isDisabled ? '-1' : '0'}
      aria-label=${name}
      aria-valuenow=${now ?? nothing}
      aria-valuemin=${min}
      aria-valuemax=${max}
      aria-valuetext=${text ?? this.localize.term('empty')}
      ?data-empty=${text === null}
      aria-disabled=${this.isDisabled ? 'true' : nothing}
      aria-readonly=${this.readOnly ? 'true' : nothing}
      @keydown=${(/** @type {KeyboardEvent} */ e) => this.#onKeyDown(kind, index, e)}
      @blur=${(/** @type {FocusEvent} */ e) => this.#onBlur(e)}
    >${text ?? '––'}</span>`;
  }

  /** @override */
  render() {
    const h12 = this.cycle === 'h12';
    const hourNow = this._hour === null ? null : h12 ? this._hour % 12 || 12 : this._hour;

    /* eslint-disable lit-a11y/click-events-have-key-events -- the label is a pointer convenience; the segments are keyboard-operable */
    const label = html`<span part="label" id=${this.#labelId} @click=${() => this.#focusSegment(0)}>${this.label}</span>`;
    const ids = this.describedByIds().join(' ');

    return renderFieldLayout(
      this,
      label,
      html`<div part="field" role="group" aria-labelledby=${this.#labelId} aria-describedby=${ids || nothing} ?data-disabled=${this.isDisabled}>
        ${this.#segment('hour', 0, this.localize.term('hours'), { now: hourNow, min: h12 ? 1 : 0, max: h12 ? 12 : 23, text: hourNow === null ? null : pad(hourNow) })}
        <span part="divider" aria-hidden="true">:</span>
        ${this.#segment('minute', 1, this.localize.term('minutes'), { now: this._minute, min: 0, max: 59, text: this._minute === null ? null : pad(this._minute) })}
        ${h12 ? this.#segment('period', 2, this.localize.term('dayPeriod'), { now: this._pm ? 1 : 0, min: 0, max: 1, text: this.#periodText(this._pm) }) : nothing}
      </div>`,
    );
  }
  /* eslint-enable lit-a11y/click-events-have-key-events */
}
