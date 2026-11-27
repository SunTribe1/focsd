import { html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import { uid } from '../internal/id.js';
import { parseISODate } from '../internal/date.js';
import { asciiDigits } from '../internal/segments.js';
import { FocsdDatePickerBase } from './date-picker-base.js';

/** @typedef {import('./calendar-base.js').FocsdCalendarBase} FocsdCalendarBase */
/** @typedef {import('./time-field-base.js').FocsdTimeFieldBase} FocsdTimeFieldBase */
/** @typedef {import('../internal/form-control.js').ValidityResult} ValidityResult */

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** `HH:mm` with optional seconds and fraction, as native `datetime-local` accepts. */
const TIME_WITH_SECONDS = /^((?:[01]\d|2[0-3]):[0-5]\d)(?::[0-5]\d(?:\.\d{1,3})?)?$/;

/** A time at minute precision: seconds are dropped; anything else is kept as it is. */
const toMinute = (/** @type {string} */ time) => TIME_WITH_SECONDS.exec(time)?.[1] ?? time;

/**
 * A `min`/`max` timestamp at minute precision, so it compares with values of the same length. A date
 * alone covers its whole day: from 00:00 as `min`, to 23:59 as `max`.
 * @param {string} value
 * @param {string} dayTime The time a date-only bound stands for.
 */
const bound = (value, dayTime) => {
  const [date, time] = split(value);

  return `${date}T${time ? toMinute(time) : dayTime}`;
};

/** Date and time of a `YYYY-MM-DDTHH:mm` string; anything after the first `T` is the time. */
const split = (/** @type {string | null | undefined} */ value) => {
  const [date = '', ...time] = (value ?? '').split('T');

  return [date, time.join('T')];
};

/** True for a real local date and time, `YYYY-MM-DDTHH:mm` (seconds allowed). */
const isDateTime = (/** @type {string} */ value) => {
  const [date, time = ''] = split(value);

  return Boolean(parseISODate(date)) && TIME_WITH_SECONDS.test(time);
};

/**
 * Date and time picker: one labeled group holding a typed `YYYY-MM-DD` input, a button that opens
 * a modal dialog, and a `focsd-time-field`. The dialog holds the calendar, a second time field and
 * a Done button: picking a day keeps it open, Done applies the day and time, Escape discards them.
 * The value is a local timestamp with no time zone, `YYYY-MM-DDTHH:mm`, like `datetime-local`.
 *
 * @attr {string} label - The visible label of the group.
 * @prop {string} label - The visible label of the group.
 * @attr {string} value - The local date and time, `YYYY-MM-DDTHH:mm` (no time zone); empty when unset.
 * @prop {string} value - The local date and time, `YYYY-MM-DDTHH:mm` (no time zone); empty when unset.
 * @attr {string} min - The earliest allowed value, `YYYY-MM-DDTHH:mm`; a date alone allows its whole day.
 * @prop {string} min - The earliest allowed value, `YYYY-MM-DDTHH:mm`; a date alone allows its whole day.
 * @attr {string} max - The latest allowed value, `YYYY-MM-DDTHH:mm`; a date alone allows its whole day.
 * @prop {string} max - The latest allowed value, `YYYY-MM-DDTHH:mm`; a date alone allows its whole day.
 * @attr {string} locale - The locale (a BCP 47 tag) for month and day names and the clock; empty follows the page.
 * @prop {string} locale - The locale (a BCP 47 tag) for month and day names and the clock; empty follows the page.
 * @fires input - Fired on every user edit of the value.
 * @fires change - Fired when the user commits a change to the value or state.
 * @csspart time - The time field, inline and in the dialog.
 * @csspart done - The dialog's Done button.
 */
export class FocsdDateTimePickerBase extends FocsdDatePickerBase {
  /** Tag of the time field rendered inline and in the dialog. */
  static timeFieldTag = 'focsd-time-field';

  /** @override */
  static dialogLabel = 'chooseDateAndTime';

  /** @override */
  static valueAttributes = ['value'];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    step: { type: Number },
    hourCycle: { attribute: 'hour-cycle' },
    _date: { state: true },
    _time: { state: true },
  };

  /** The day picked in the open dialog, applied by Done. */
  #draft = '';

  #labelId = uid('focsd-date-time-label');

  constructor() {
    super();
    /** Minutes between times when stepping the time with the arrow keys. */
    this.step = 1;
    /** Twelve- or 24-hour clock; empty follows the locale. @type {'h12' | 'h23' | ''} */
    this.hourCycle = '';
    /** @internal */
    this._date = '';
    /** @internal */
    this._time = '';
  }

  /**
   * The two parts joined, or empty until both are real: a half-typed date or time is no value (as
   * native `datetime-local`). Validity still reads the parts, so it reports the bad input.
   */
  get #composed() {
    return parseISODate(this._date) && TIME.test(this._time) ? `${this._date}T${this._time}` : '';
  }

  /**
   * Internal edits keep `value` equal to the joined parts; a value set from outside is split again.
   * @override
   */
  willUpdate() {
    if (this.value !== this.#composed) this.#adopt(this.value);
    super.willUpdate();
  }

  /**
   * Take a value set from outside. Seconds are dropped (minute precision): `09:30:59` reads back as `09:30`.
   * @param {string} value
   */
  #adopt(value) {
    this.#split(value);

    if (this.#composed && isDateTime(value)) this.value = this.#composed;
  }

  /**
   * Native `datetime-local` has no `valueAsDate`: always null.
   * @override
   */
  get valueAsDate() {
    return null;
  }
  /** @override */
  set valueAsDate(_date) {
    throw new DOMException('This picker does not support valueAsDate.', 'InvalidStateError');
  }

  /**
   * Milliseconds since the epoch, reading the local timestamp as UTC (as native), or NaN.
   * @override
   */
  get valueAsNumber() {
    return isDateTime(this.value) ? Date.parse(`${this.value}Z`) : NaN;
  }
  /** @override */
  set valueAsNumber(time) {
    const date = new Date(Number.isFinite(time) ? time : NaN);
    const year = date.getUTCFullYear();

    // Years 1–9999 only: outside them `toISOString` writes a signed six-digit year, or throws.
    this.value = year >= 1 && year <= 9999 ? date.toISOString().slice(0, 16) : '';
  }

  /** @override @returns {ValidityResult} */
  computeValidity() {
    const term = (/** @type {string} */ key, /** @type {unknown[]} */ ...args) => this.localize.term(key, ...args);

    if (!this._date && !this._time) return this.required ? [{ valueMissing: true }, term('enterDateTime')] : [{}, ''];

    // One part missing, or a time from code that no time field could show (`9:30`, `24:00`).
    if (!this._date || !TIME.test(this._time)) return [{ badInput: true }, term('enterDateTime')];

    // `checkDate` would compare the date with the timestamps in min/max, and read `step` as days.
    if (!parseISODate(this._date)) return [{ typeMismatch: true }, term('dateFormat')];

    if (this.min && this.value < bound(this.min, '00:00')) return [{ rangeUnderflow: true }, term('dateTimeMin', this.min)];

    if (this.max && this.value > bound(this.max, '23:59')) return [{ rangeOverflow: true }, term('dateTimeMax', this.max)];

    return [{}, ''];
  }

  /** @override @param {string} state */
  restoreState(state) {
    this.#fill(isDateTime(state) ? state : '');
  }

  /** @override */
  formResetCallback() {
    super.formResetCallback();
    this.#fill(this.defaults.value ?? '');
  }

  /**
   * Set the value and both parts, clearing half-typed time segments (with the value unchanged,
   * willUpdate would leave them behind).
   * @param {string} value
   */
  #fill(value) {
    for (const field of this.#timeFields()) field.formResetCallback();
    this.value = value;
    this.#split(value);
  }

  /** @param {string} value */
  #split(value) {
    const [date = '', time = ''] = split(value);
    this._date = date;
    this._time = toMinute(time);
  }

  /** @returns {FocsdTimeFieldBase[]} */
  #timeFields() {
    return [...this.renderRoot.querySelectorAll('[part~="time"]')].map((f) => /** @type {FocsdTimeFieldBase} */ (f));
  }

  /** True from an inline edit that changed the value until its `change` is fired. */
  #changed = false;

  /** Commit both parts to `value`; fire `input` only when the value changed (half entries do not). */
  #commit() {
    const changed = this.value !== this.#composed;
    this.value = this.#composed;

    if (!changed) return;
    this.#changed = true;
    this.emitValue(false);
  }

  /**
   * @param {string} _key
   * @param {Event} event
   * @override
   */
  onTextInput(_key, event) {
    // The native input event crosses the shadow root: the host fires its own, only on a value change.
    event.stopPropagation();
    const input = /** @type {HTMLInputElement} */ (event.target);
    this._date = asciiDigits(input.value);
    this.#commit();
  }

  /**
   * Leaving the date input commits only an edit that changed the value (as the time field).
   * @override
   */
  onTextChange = () => {
    this._showInvalid = true;

    if (!this.#changed) return;
    this.#changed = false;
    this.dispatchEvent(new Event('change', { bubbles: true }));
  };

  /**
   * WebKit fires no native `change` when leaving an input whose value a script rewrote (the typed
   * digits are normalized): leaving the date input after a value-changing edit commits it as well.
   * @param {FocusEvent} event
   */
  #onFieldFocusOut = (event) => {
    if (this.#changed && event.composedPath()[0] === this.renderRoot.querySelector('[part~="control"]')) this.onTextChange();
  };

  #onTimeInput = (/** @type {Event} */ event) => {
    event.stopPropagation();
    this._time = /** @type {FocsdTimeFieldBase} */ (event.target).value;
    this.#commit();
  };

  #onTimeChange = (/** @type {Event} */ event) => {
    event.stopPropagation();

    if (!this.#changed) return;
    this.#changed = false;
    this._showInvalid = true;
    this.dispatchEvent(new Event('change', { bubbles: true }));
  };

  /** The dialog's time field is a draft until Done: its events stay inside. */
  #stop = (/** @type {Event} */ event) => event.stopPropagation();

  /** @override @param {FocsdCalendarBase} _calendar */
  syncCalendar(_calendar) {
    this.#draft = '';
    /** @type {FocsdCalendarBase} */ (this.calendar).value = parseISODate(this._date) ? this._date : '';
    const time = /** @type {FocsdTimeFieldBase} */ (this.dialog?.querySelector('[part~="time"]'));
    time.formResetCallback();
    time.value = this._time;
  }

  /**
   * A picked day is a draft: the dialog stays open for the time.
   * @param {FocsdCalendarBase} calendar
   * @returns {boolean}
   * @override
   */
  applyCalendar(calendar) {
    this.#draft = calendar.value;

    return false;
  }

  #onDone = () => {
    const time = /** @type {FocsdTimeFieldBase} */ (this.dialog?.querySelector('[part~="time"]'));
    // Compared with the current value, not the one at opening: a script may have set it meanwhile.
    const before = this.value;
    this._date = this.#draft || this._date;
    this._time = time.value;
    this.value = this.#composed;
    // Done commits: show what is wrong with the result now, as leaving the text input does.
    this._showInvalid = true;

    if (this.value !== before) this.emit();
    /** @type {HTMLDialogElement} */ (this.dialog).close();
  };

  /**
   * Escape, Cancel, a backdrop click and Done all end here: the draft goes, focus returns to the trigger.
   * @override
   */
  onDialogClose() {
    this.#draft = '';
    super.onDialogClose();
  }

  /**
   * A time field: the inline one edits the value; the dialog's one is a draft until Done.
   * @param {boolean} inline
   */
  renderTimeField(inline) {
    const tag = unsafeStatic(/** @type {typeof FocsdDateTimePickerBase} */ (this.constructor).timeFieldTag);

    // The inline one is also described by the picker's hint and message (ids in this shadow root).
    return staticHtml`<${tag} part="time" ?data-inline=${inline} label=${this.localize.term('time')} .value=${inline ? live(this._time) : ''}
      aria-describedby=${(inline && this.describedBy()) || nothing}
      .step=${this.step} .hourCycle=${this.hourCycle} .locale=${this.locale} ?disabled=${this.isDisabled} ?readonly=${this.readOnly}
      @input=${inline ? this.#onTimeInput : this.#stop} @change=${inline ? this.#onTimeChange : this.#stop}></${tag}>`;
  }

  /** The described text the inline time field last copied. */
  #timeDescription = '';

  /** @override */
  updated() {
    super.updated();
    // The time field copies the described text when it updates: the text may change under the same
    // ids, so it is told to update when the text differs from what it last copied.
    const time = /** @type {FocsdTimeFieldBase | null} */ (this.renderRoot.querySelector('[part~="time"][data-inline]'));
    const text = time ? time.idrefText(time.getAttribute('aria-describedby')) : '';

    if (!time || text === this.#timeDescription) return;
    this.#timeDescription = text;
    time.requestUpdate();
  }

  /** @override */
  renderFields() {
    return this.renderLayout(
      html`<span part="label" id=${this.#labelId}>${this.label}</span>`,
      html`<div part="field" role="group" aria-labelledby=${this.#labelId} @focusout=${this.#onFieldFocusOut}>
        ${this.renderTextInput(this.ids.input, '_date', this.localize.term('date'))}${this.renderTrigger(this.localize.term('chooseDateAndTime'))}${this.renderTimeField(true)}
      </div>`,
    );
  }

  /** @override */
  render() {
    return html`${this.renderFields()}${this.renderDialog(
      this.renderTimeField(false),
      html`<button part="done" type="button" @click=${this.#onDone}>${this.localize.term('done')}</button>`,
    )}`;
  }
}
