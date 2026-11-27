import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { uid } from '../internal/id.js';
import { iconSvg } from '../internal/icons.js';
import { eventLegend, eventMarkers, eventsByDate, eventsLabel, eventsText } from './calendar-events.js';
import { addDays, addMonths, firstDayOfWeek, monthWeeks, parseISODate, startOfWeek, toISODate, todayUTC } from '../internal/date.js';

const resolveLocale = (/** @type {string | null | undefined} */ locale) =>
  locale || globalThis.document?.documentElement?.lang || globalThis.navigator?.language || 'en';

/**
 * APG date grid. Days are gridcells with roving tabindex; arrows move by day/week (mirrored in
 * RTL), PageUp/PageDown by month, Shift+PageUp/PageDown by year, Home/End to week start/end.
 * `range` mode selects `value-start`..`value-end`. Fires `change` when a date is chosen.
 *
 * @fires change - Fired when the user commits a change to the value or state.
 * @csspart day - Each day cell.
 * @csspart grid - The grid element.
 * @csspart header - The header element.
 * @csspart heading - The heading element.
 * @csspart nav - Both month buttons.
 * @csspart next - The next month button.
 * @csspart pad - An empty cell before the first or after the last day of the month.
 * @csspart previous - The previous month button.
 * @csspart range-edge - Added to the first and last day of a selected range.
 * @csspart selected - Added to selected days.
 * @csspart today - Added to today's date.
 * @csspart weekday - A weekday column header.
 * @csspart events - The markers under a day with events.
 * @csspart event - One event marker (in a day or the legend).
 * @csspart legend - The list of event kinds, with `legend`.
 * @csspart legend-item - One event kind in the legend.
 */
export class FocsdCalendarBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    value: { reflect: true },
    min: {},
    max: {},
    range: { type: Boolean, reflect: true },
    valueStart: { attribute: 'value-start', reflect: true },
    valueEnd: { attribute: 'value-end', reflect: true },
    locale: {},
    events: { type: Array },
    legend: { type: Boolean, reflect: true },
    _focus: { state: true },
  };

  #headingId = uid('focsd-calendar-heading');

  #moveFocus = false;

  constructor() {
    super();
    /** The selected date, `YYYY-MM-DD`. */
    this.value = '';
    /** @type {import('./calendar-events.js').CalendarEvent[]} Events marked on their days and named in each day's label: `{ date, label, kind?, color?, tone? }`. */
    this.events = [];
    /** Show a legend of the events' kinds under the grid. */
    this.legend = false;
    /** The earliest date that can be chosen, `YYYY-MM-DD`. */
    this.min = '';
    /** The latest date that can be chosen, `YYYY-MM-DD`. */
    this.max = '';
    /** Chooses a range: the first date picked is the start, the second the end. */
    this.range = false;
    /** The start of the selected range, `YYYY-MM-DD`. */
    this.valueStart = '';
    /** The end of the selected range, `YYYY-MM-DD`. */
    this.valueEnd = '';
    /** A BCP 47 locale tag for month and day names; defaults to the page's language. */
    this.locale = '';
    /** @internal */
    this._focus = '';
  }

  /** The date the grid opens on: the selection, else today, clamped to min/max. */
  #initialFocus() {
    const chosen = parseISODate(this.range ? this.valueStart : this.value);
    const today = toISODate(todayUTC());
    let iso = chosen ? toISODate(chosen) : today;

    if (this.min && iso < this.min) iso = this.min;

    if (this.max && iso > this.max) iso = this.max;

    return iso;
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  willUpdate(changed) {
    if (!this._focus || changed.has('value') || changed.has('valueStart')) {
      if (!this.#moveFocus) this._focus = this.#initialFocus();
    }
  }

  /** @override */
  updated() {
    if (!this.#moveFocus) return;
    this.#moveFocus = false;
    /** @type {HTMLElement} */ (this.renderRoot.querySelector('[role="gridcell"][tabindex="0"]'))?.focus();
  }

  /** Move keyboard focus to the active day (used by date pickers when their dialog opens). */
  async focusDay() {
    this._focus = this.#initialFocus();
    await this.updateComplete;
    /** @type {HTMLElement} */ (this.renderRoot.querySelector('[role="gridcell"][tabindex="0"]'))?.focus();
  }

  /**
   * Whether a date (`YYYY-MM-DD`) cannot be chosen: outside `min`/`max` or rejected by `isDateDisabled`.
   * @param {string} iso
   * @returns {boolean}
   */
  isDisabledDate(iso) {
    return Boolean((this.min && iso < this.min) || (this.max && iso > this.max));
  }

  /**
   * Whether a date (`YYYY-MM-DD`) is the selected date or inside the selected range.
   * @param {string} iso
   * @returns {boolean}
   */
  isSelectedDate(iso) {
    if (!this.range) return iso === this.value;

    if (!this.valueStart) return false;

    return this.valueEnd ? iso >= this.valueStart && iso <= this.valueEnd : iso === this.valueStart;
  }

  /**
   * Choose a date; in range mode the first pick sets the start, the second the end.
   * @param {string} iso
   */
  select(iso) {
    if (this.isDisabledDate(iso)) return;
    this._focus = iso;

    if (!this.range) this.value = iso;
    else if (!this.valueStart || this.valueEnd || iso < this.valueStart) {
      this.valueStart = iso;
      this.valueEnd = '';
    } else this.valueEnd = iso;
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /** @param {Date} date */
  #go(date) {
    this._focus = toISODate(date);
    this.#moveFocus = true;
  }

  #onKeyDown = (/** @type {KeyboardEvent} */ event) => {
    const day = /** @type {Date} */ (parseISODate(this._focus));
    const rtl = getComputedStyle(this).direction === 'rtl';
    const first = firstDayOfWeek(resolveLocale(this.locale || this.localize.locale()));

    switch (event.key) {
      case 'ArrowRight':
        this.#go(addDays(day, rtl ? -1 : 1));
        break;
      case 'ArrowLeft':
        this.#go(addDays(day, rtl ? 1 : -1));
        break;
      case 'ArrowDown':
        this.#go(addDays(day, 7));
        break;
      case 'ArrowUp':
        this.#go(addDays(day, -7));
        break;
      case 'PageDown':
        this.#go(addMonths(day, event.shiftKey ? 12 : 1));
        break;
      case 'PageUp':
        this.#go(addMonths(day, event.shiftKey ? -12 : -1));
        break;
      case 'Home':
        this.#go(startOfWeek(day, first));
        break;
      case 'End':
        this.#go(addDays(startOfWeek(day, first), 6));
        break;
      case 'Enter':
      case ' ':
        this.select(this._focus);
        break;
      default:
        return;
    }

    event.preventDefault();
  };

  /**
   * True when moving `months` from the shown month would leave the min/max range entirely.
   * @param {number} months
   */
  #monthOutOfRange(months) {
    const target = toISODate(addMonths(parseISODate(this._focus) ?? new Date(), months)).slice(0, 7);

    return Boolean((months < 0 && this.min && target < this.min.slice(0, 7)) || (months > 0 && this.max && target > this.max.slice(0, 7)));
  }

  /** @param {number} months */
  #shiftMonth(months) {
    if (this.#monthOutOfRange(months)) return;
    this._focus = toISODate(addMonths(/** @type {Date} */ (parseISODate(this._focus)), months));
  }

  /**
   * @param {string} locale
   * @param {number} first
   */
  #renderHead(locale, first) {
    const long = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' });
    const short = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
    // 2024-01-01 is a Monday; offset to the locale's first weekday.
    const days = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(2024, 0, first + i)));

    return html`<tr>${days.map((d) => html`<th part="weekday" scope="col" abbr=${long.format(d)}><span aria-hidden="true">${short.format(d)}</span><span class="focsd-visually-hidden">${long.format(d)}</span></th>`)}</tr>`;
  }

  /**
   * @param {Date | null} date
   * @param {Intl.DateTimeFormat} label
   * @param {string} todayIso
   * @param {Map<string, import('./calendar-events.js').CalendarEvent[]>} byDate
   */
  #renderDay(date, label, todayIso, byDate) {
    if (!date) return html`<td part="pad"></td>`;
    const iso = toISODate(date);
    const disabled = this.isDisabledDate(iso);
    const selected = this.isSelectedDate(iso);
    const edge = this.range && (iso === this.valueStart || iso === this.valueEnd);
    const events = byDate.get(iso) ?? [];

    return html`<td
      part="day ${selected ? 'selected' : ''} ${edge ? 'range-edge' : ''} ${iso === todayIso ? 'today' : ''}"
      role="gridcell"
      data-date=${iso}
      tabindex=${iso === this._focus ? '0' : '-1'}
      aria-selected=${String(selected)}
      aria-disabled=${disabled ? 'true' : nothing}
      aria-current=${iso === todayIso ? 'date' : nothing}
      aria-label=${label.format(date) + eventsLabel(events)}
      title=${events.length ? eventsText(events) : nothing}
      @click=${() => this.select(iso)}
    >${date.getUTCDate()}${eventMarkers(events)}</td>`;
  }

  /** @override */
  render() {
    const locale = resolveLocale(this.locale || this.localize.locale());
    const first = firstDayOfWeek(locale);
    const focus = parseISODate(this._focus) ?? new Date();
    const heading = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(focus);
    const label = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    const todayIso = toISODate(todayUTC());
    const weeks = monthWeeks(focus.getUTCFullYear(), focus.getUTCMonth(), first);
    const byDate = eventsByDate(this.events);

    return html`<div part="header">
        <button part="nav previous" type="button" aria-label=${this.localize.term('previousMonth')} aria-disabled=${this.#monthOutOfRange(-1) ? 'true' : nothing} @click=${() => this.#shiftMonth(-1)}>${iconSvg('chevron-left', 'icon')}</button>
        <h2 part="heading" id=${this.#headingId} aria-live="polite">${heading}</h2>
        <button part="nav next" type="button" aria-label=${this.localize.term('nextMonth')} aria-disabled=${this.#monthOutOfRange(1) ? 'true' : nothing} @click=${() => this.#shiftMonth(1)}>${iconSvg('chevron-right', 'icon')}</button>
      </div>
      <table part="grid" role="grid" aria-labelledby=${this.#headingId} @keydown=${this.#onKeyDown}>
        <thead>${this.#renderHead(locale, first)}</thead>
        <tbody>${weeks.map((week) => html`<tr>${week.map((d) => this.#renderDay(d, label, todayIso, byDate))}</tr>`)}</tbody>
      </table>
      ${this.legend ? eventLegend(byDate, this.localize.term('calendarLegend')) : nothing}`;
  }
}
