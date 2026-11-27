import { html } from 'lit';
import { uid } from '../internal/id.js';
import { FocsdDatePickerBase } from './date-picker-base.js';

/** @typedef {import('./calendar-base.js').FocsdCalendarBase} FocsdCalendarBase */
/** @typedef {import('../internal/form-control.js').ValidityResult} ValidityResult */

/**
 * Date range picker: start and end inputs plus a range-mode calendar dialog. Form: `<name>-start`, `<name>-end`.
 *
 * @csspart field - The field element.
 * @csspart group - The group element.
 * @csspart label - The label element.
 * @csspart range - Added to the field of a date range picker.
 * @csspart sublabel - The "Start date" and "End date" labels.
 */
export class FocsdDateRangePickerBase extends FocsdDatePickerBase {
  /** @override */
  static dialogLabel = 'chooseDates';

  /** @override */
  static valueAttributes = ['value-start', 'value-end'];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    valueStart: { attribute: 'value-start' },
    valueEnd: { attribute: 'value-end' },
  };

  constructor() {
    super();
    // Here rather than as a field initializer: that would read `ids` before the base class set it.
    this.ids = { ...this.ids, end: uid('focsd-date-end'), label: uid('focsd-date-label') };
    /** The start of the range, `YYYY-MM-DD`. */
    this.valueStart = '';
    /** The end of the range, `YYYY-MM-DD`. */
    this.valueEnd = '';
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();

    if (!this.hasUpdated) {
      // Read through the base type: the base class field already holds the captured attributes.
      const captured = /** @type {FocsdDatePickerBase} */ (this).defaults;
      this.defaults = { valueStart: captured['value-start'] ?? '', valueEnd: captured['value-end'] ?? '' };
    }
  }

  /** @override */
  get rangeMode() {
    return true;
  }

  /**
   * The group carries the description; the inputs would only repeat it.
   * @override
   */
  describedBy() {
    return '';
  }

  /** @override @returns {ValidityResult} */
  computeValidity() {
    // Half a range is not a range: once one date is entered, the other is required.
    const partial = Boolean(this.valueStart) !== Boolean(this.valueEnd);
    const required = this.required || partial;
    const start = this.checkDate(this.valueStart, { required, empty: this.localize.term('enterStartDate') });

    if (start[1]) return start;
    const end = this.checkDate(this.valueEnd, { required, empty: this.localize.term('enterEndDate') });

    // Problems with the end date (or the order) point at the end date's input.
    if (end[1]) return [end[0], end[1], 'end'];

    if (this.valueStart && this.valueEnd && this.valueEnd < this.valueStart)
      return [{ rangeUnderflow: true }, this.localize.term('dateRangeOrder'), 'end'];

    return [{}, ''];
  }

  /** @override @returns {string | FormData | null} */
  formValue() {
    if (!this.name) return null;
    const data = new FormData();
    data.append(`${this.name}-start`, this.valueStart);
    data.append(`${this.name}-end`, this.valueEnd);

    return data;
  }

  /** @override */
  formState() {
    return `${this.valueStart}/${this.valueEnd}`;
  }

  /** @override @param {string} state */
  restoreState(state) {
    const [start = '', end = ''] = state.split('/');
    this.valueStart = start;
    this.valueEnd = end;
  }

  /** @override @param {FocsdCalendarBase} calendar */
  syncCalendar(calendar) {
    calendar.valueStart = this.valueStart;
    calendar.valueEnd = this.valueEnd;
  }

  /**
   * @param {FocsdCalendarBase} calendar
   * @returns {boolean}
   * @override
   */
  applyCalendar(calendar) {
    if (!calendar.valueEnd) return false;
    this.valueStart = calendar.valueStart;
    this.valueEnd = calendar.valueEnd;

    return true;
  }

  /** @override */
  renderFields() {
    return html`<div part="group" role="group" aria-labelledby=${this.ids.label} aria-describedby=${this.describedByIds().join(' ')}>${this.renderLayout(
      html`<span part="label" id=${this.ids.label}>${this.label}</span>`,
      html`<div part="field range">
        <label part="sublabel" for=${this.ids.input}>${this.localize.term('startDate')}</label>
        ${this.renderTextInput(this.ids.input, 'valueStart')}
        <label part="sublabel" for=${this.ids.end}>${this.localize.term('endDate')}</label>
        ${this.renderTextInput(this.ids.end, 'valueEnd')}
        ${this.renderTrigger(this.localize.term('chooseDates'))}
      </div>`,
    )}</div>`;
  }
}
