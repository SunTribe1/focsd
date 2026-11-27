import { html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import { FocsdElement } from '../internal/focsd-element.js';
import { FormControlMixin, restoredText } from '../internal/form-control.js';
import { pickMessage, renderFieldLayout } from '../internal/field-messages.js';
import { uid } from '../internal/id.js';
import { iconSvg } from '../internal/icons.js';
import { DAY, isoToTime, parseISODate, toISODate } from '../internal/date.js';

/** @typedef {import('./calendar-base.js').FocsdCalendarBase} FocsdCalendarBase */
/** @typedef {import('../internal/form-control.js').ValidityResult} ValidityResult */

/**
 * Date picker: a typed `YYYY-MM-DD` input (validated) plus a button that opens a modal native
 * <dialog> holding the calendar (tag from `static calendarTag`). Choosing a date fills the input,
 * closes the dialog and returns focus to the button; Escape cancels.
 *
 * @fires input - Fired on every user edit of the value.
 * @fires change - Fired when the user commits a change to the value or state.
 * @csspart calendar - The calendar inside the dialog.
 * @csspart calendar-day - Calendar parts, re-exported with a `calendar-` prefix (calendar-day, calendar-nav, calendar-heading, calendar-grid, calendar-weekday, calendar-today, calendar-selected, …).
 * @csspart panel - The dialog's content: the calendar, any extra fields and the actions.
 * @csspart actions - The row of dialog buttons at the bottom.
 * @csspart cancel - The dialog's Cancel button (also exposed as `close`).
 * @csspart close - The dialog's Cancel button (kept for existing stylesheets).
 * @csspart control - The control element.
 * @csspart dialog - The dialog element.
 * @csspart field - The field element.
 * @csspart label - The label element.
 * @csspart layout - The wrapper that places the label beside or above the body.
 * @csspart body - The control, hint and message.
 * @csspart hint - The author hint followed by the date format.
 * @csspart message - The shown error, warning or success message (also `error`, `warning` or `success`).
 * @csspart message-icon - The message's icon.
 * @csspart announcer - The visually hidden status region.
 * @csspart trigger - The trigger element.
 */
export class FocsdDatePickerBase extends FormControlMixin(FocsdElement) {
  /** `readonly` applies here (no edits, barred from validation), as on native text-like inputs. */
  static supportsReadOnly = true;

  /** @override */
  static shadowRootOptions = { ...FocsdElement.shadowRootOptions, delegatesFocus: true };

  /** Tag of the calendar element rendered in the dialog. */
  static calendarTag = 'focsd-calendar';

  /** Translation key for the dialog's name. */
  static dialogLabel = 'chooseDate';

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    label: {},
    value: {},
    min: {},
    max: {},
    locale: {},
    step: { type: Number },
    autocomplete: {},
    _showInvalid: { state: true },
  };

  /** @type {{ input: string, [key: string]: string }} For subclasses: the IDs of the parts in the shadow root. */
  ids = { input: uid('focsd-date-input') };

  /** @type {Record<string, string>} For subclasses: the default value of each text input, by key, for form reset. */
  defaults = {};

  /** [flags, message] for the current value, computed before each render. */
  /** Validity flags, message, and the id key of the input to anchor the message to. */
  /** @type {ValidityResult} */
  #check = [{}, ''];

  constructor() {
    super();
    /** The visible label. */
    this.label = '';
    /** The date, `YYYY-MM-DD`. */
    this.value = '';
    /** The earliest date allowed, `YYYY-MM-DD`. */
    this.min = '';
    /** The latest date allowed, `YYYY-MM-DD`. */
    this.max = '';
    /** A BCP 47 locale tag for the date format; defaults to the page's language. */
    this.locale = '';
    /** Allowed day interval counted from `min` (or 1970-01-01), like native `step` on date inputs. */
    this.step = 1;
    /** @type {AutoFill} Autofill token for the text input(s), e.g. `bday` (WCAG 1.3.5). */
    this.autocomplete = 'off';
    this._showInvalid = false;
    this.addEventListener('invalid', () => {
      this._showInvalid = true;
    });
  }

  /**
   * The author's messages, with the built-in invalid message as the error once it is due.
   * @override
   */
  get shownMessage() {
    return pickMessage({ error: this.error || (this.invalidShown ? this.#check[1] : ''), warning: this.warning, success: this.success });
  }

  /**
   * The built-in format hint is always there, so the hint id is always listed.
   * @returns {string[]}
   * @override
   */
  describedByIds() {
    return [this.messageIds.hint, this.shownMessage ? this.messageIds.message : ''].filter(Boolean);
  }

  /** Attributes captured at first connect, restored on form reset. */
  static valueAttributes = ['value'];

  /** @override */
  connectedCallback() {
    super.connectedCallback();

    if (!this.hasUpdated)
      for (const a of /** @type {typeof FocsdDatePickerBase} */ (this.constructor).valueAttributes)
        this.defaults[a] = this.getAttribute(a) ?? '';
  }

  /**
   * For subclasses: the calendar dialog in the shadow root.
   * @returns {HTMLDialogElement | null}
   */
  get dialog() {
    return this.renderRoot.querySelector('dialog');
  }

  /**
   * For subclasses: the calendar in the shadow root.
   * @returns {import('./calendar-base.js').FocsdCalendarBase | null}
   */
  get calendar() {
    return this.renderRoot.querySelector('[part~="calendar"]');
  }

  /**
   * For subclasses: the button that opens the calendar.
   * @returns {HTMLButtonElement | null}
   */
  get trigger() {
    return this.renderRoot.querySelector('[part~="trigger"]');
  }

  /**
   * Validate one date string: [flags, message].
   * @param {string} text
   * @param {{ required?: boolean, empty?: string }} [options]
   * @returns {ValidityResult}
   */
  checkDate(text, { required = this.required, empty = this.localize.term('enterDate') } = {}) {
    if (!text) return required ? [{ valueMissing: true }, empty] : [{}, ''];

    if (!parseISODate(text)) return [{ typeMismatch: true }, this.localize.term('dateFormat')];

    if (this.min && text < this.min) return [{ rangeUnderflow: true }, this.localize.term('dateMin', this.min)];

    if (this.max && text > this.max) return [{ rangeOverflow: true }, this.localize.term('dateMax', this.max)];
    const step = Math.floor(Number(this.step));

    if (step > 1) {
      const base = isoToTime(this.min) || 0;

      if (Math.round((isoToTime(text) - base) / DAY) % step !== 0)
        return [{ stepMismatch: true }, this.localize.term('dateStep', step, this.min)];
    }

    return [{}, ''];
  }

  /** The value as a Date at UTC midnight, or null. Setting null clears the value. */
  get valueAsDate() {
    const time = isoToTime(this.value);

    return Number.isNaN(time) ? null : new Date(time);
  }
  set valueAsDate(date) {
    this.value = date instanceof Date && !Number.isNaN(date.getTime()) ? toISODate(date) : '';
  }

  /** Milliseconds since the epoch (UTC midnight), or NaN when empty. */
  get valueAsNumber() {
    return isoToTime(this.value);
  }
  set valueAsNumber(time) {
    this.valueAsDate = Number.isFinite(time) ? new Date(time) : null;
  }

  /** Open the calendar from code, like native `showPicker()`. */
  showPicker() {
    if (this.isDisabled || this.readOnly) throw new DOMException('The date picker is not mutable.', 'InvalidStateError');
    this.openDialog();
  }

  /**
   * For subclasses: the validity of the current value.
   * @returns {ValidityResult}
   */
  computeValidity() {
    return this.checkDate(this.value);
  }

  /**
   * For subclasses: the value submitted with the form.
   * @returns {string | FormData | null}
   */
  formValue() {
    return this.value;
  }

  /** State saved for back/forward restore. */
  formState() {
    return this.value;
  }

  /** @param {string | File | FormData | null} state */
  formStateRestoreCallback(state) {
    this.restoreState(restoredText(state) ?? '');
  }

  /**
   * For subclasses: restores the value from the form state.
   * @param {string} state
   */
  restoreState(state) {
    this.value = state;
  }

  /** For subclasses: whether the invalid state is shown. */
  get invalidShown() {
    return this._showInvalid && Boolean(this.#check[1]);
  }

  /** The author hint first, then the built-in date format. */
  get fullHint() {
    return `${this.hint ? `${this.hint}. ` : ''}${this.localize.term('dateFormatHint')}`;
  }

  /** @override */
  willUpdate() {
    this.#check = this.computeValidity();
  }

  /** @override */
  updated() {
    this.internals.setFormValue(this.formValue(), this.formState());
    const [flags, message, anchor = 'input'] = this.#check;

    const input =
      /** @type {ShadowRoot} */ (this.renderRoot).getElementById?.(/** @type {string} */ (this.ids[anchor])) ??
      this.renderRoot.querySelector('input');

    this.setValidityState(flags, message, input);

    // The mixin removes the aria-invalid it wrote when `error` goes; a shown built-in error still needs it.
    if (this.shownMessage?.kind === 'error')
      for (const field of this.renderRoot.querySelectorAll('input')) field.setAttribute('aria-invalid', 'true');
  }

  formResetCallback() {
    this._showInvalid = false;
    Object.assign(this, this.defaults);
  }

  /** Fire `input` and `change` for a committed date. Subclasses may override it. */
  emit() {
    this.emitValue();
  }

  /**
   * Copy the current selection into the calendar before opening.
   * @param {FocsdCalendarBase} calendar
   */
  syncCalendar(calendar) {
    calendar.value = this.value;
  }

  /**
   * Apply the calendar's selection; return true when the dialog should close.
   * @param {FocsdCalendarBase} calendar
   * @returns {boolean}
   */
  applyCalendar(calendar) {
    this.value = calendar.value;

    return true;
  }

  /** Open the calendar dialog and focus its active day. Does nothing while disabled or read-only. */
  async openDialog() {
    if (this.isDisabled || this.readOnly) return;
    const calendar = /** @type {FocsdCalendarBase} */ (this.calendar);
    this.syncCalendar(calendar);
    /** @type {HTMLDialogElement} */ (this.dialog).showModal();
    await calendar.updateComplete;
    calendar.focusDay();
  }

  #onCalendarChange = (/** @type {Event} */ event) => {
    event.stopPropagation();

    if (!this.applyCalendar(/** @type {FocsdCalendarBase} */ (event.target))) return;
    this.emit();
    /** @type {HTMLDialogElement} */ (this.dialog).close();
  };

  /** Escape, the close button and a chosen date all end here: focus goes back to the trigger. Subclasses may extend it. */
  onDialogClose() {
    /** @type {HTMLElement} */ (this.trigger)?.focus();
  }

  #onDialogClose = () => this.onDialogClose();

  /**
   * For subclasses: handles typing in a text input.
   * @param {string} key Property the input edits (`value`, `valueStart`, `valueEnd`).
   * @param {Event} event
   */
  onTextInput(key, event) {
    // The host fires the one `input` (below): the inner input's own event, which is composed, stops here.
    event.stopPropagation();
    const host = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (this));
    host[key] = /** @type {HTMLInputElement} */ (event.target).value;
    this.emitValue(false);
  }

  /** For subclasses: handles the text input's `change` event. */
  onTextChange = () => {
    // The person left the field with a value: from now on, show what is wrong with it.
    this._showInvalid = true;
    this.dispatchEvent(new Event('change', { bubbles: true }));
  };

  /** Implicit submission: Enter submits the owning form. */
  onTextKeyDown = (/** @type {KeyboardEvent} */ event) => {
    if (event.key === 'Enter' && !event.isComposing) this.form?.requestSubmit();
  };

  /** For subclasses: the IDs that describe the text input. */
  describedBy() {
    return this.describedByIds().join(' ');
  }

  /**
   * The shared layout around a label and body, with the composed hint.
   * @param {unknown} label
   * @param {unknown} body
   */
  renderLayout(label, body) {
    return renderFieldLayout(
      {
        hint: this.fullHint,
        shownMessage: this.shownMessage,
        messageIds: this.messageIds,
        effectiveLabelPosition: this.effectiveLabelPosition,
        localize: this.localize,
      },
      label,
      body,
    );
  }

  /**
   * For subclasses: renders one text input.
   * @param {string} id
   * @param {string} key Property the input shows and edits.
   * @param {string} [label]
   */
  renderTextInput(id, key, label) {
    const host = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (this));

    return html`<input
      part="control"
      id=${id}
      type="text"
      inputmode="numeric"
      autocomplete=${this.autocomplete || 'off'}
      placeholder=${this.localize.term('dateFormatPlaceholder')}
      aria-label=${label ?? nothing}
      aria-describedby=${this.describedBy() || nothing}
      aria-invalid=${this.shownMessage?.kind === 'error' ? 'true' : nothing}
      .value=${live(host[key] ?? '')}
      ?disabled=${this.isDisabled}
      ?readonly=${this.readOnly}
      ?required=${this.required}
      @input=${(/** @type {Event} */ e) => this.onTextInput(key, e)}
      @change=${this.onTextChange}
      @keydown=${this.onTextKeyDown}
    />`;
  }

  /**
   * For subclasses: renders the button that opens the calendar.
   * @param {string} label
   */
  renderTrigger(label) {
    return html`<button part="trigger" type="button" aria-label=${label} ?disabled=${this.isDisabled || this.readOnly} @click=${() => this.openDialog()}>${iconSvg('calendar', 'icon')}</button>`;
  }

  /** For subclasses: renders the text input(s). */
  renderFields() {
    return this.renderLayout(
      html`<label part="label" for=${this.ids.input}>${this.label}</label>`,
      html`<div part="field">${this.renderTextInput(this.ids.input, 'value')}${this.renderTrigger(this.localize.term('chooseDate'))}</div>`,
    );
  }

  /** Extra calendar attributes (range mode). */
  get rangeMode() {
    return false;
  }

  /**
   * The modal dialog: the calendar (`min`/`max` cut to their date part), then `extra`, then a row with
   * Cancel and `actions`. Subclasses add their own content (the date and time picker's time field and
   * Done button). A click on the backdrop closes it, like Escape and Cancel.
   * @param {unknown} [extra]
   * @param {unknown} [actions]
   */
  renderDialog(extra = nothing, actions = nothing) {
    const ctor = /** @type {typeof FocsdDatePickerBase} */ (this.constructor);
    const tag = unsafeStatic(ctor.calendarTag);
    const close = () => /** @type {HTMLDialogElement} */ (this.dialog).close();

    // The click is for the backdrop only; the keyboard closes the dialog with Escape (native) or Cancel.
    // eslint-disable-next-line lit-a11y/click-events-have-key-events -- backdrop click mirrors native Escape
    return html`<dialog part="dialog" aria-label=${this.localize.term(ctor.dialogLabel)} @close=${this.#onDialogClose} @click=${this.#onDialogClick}>
      <div part="panel">
        ${staticHtml`<${tag} part="calendar" exportparts="day: calendar-day, grid: calendar-grid, header: calendar-header, heading: calendar-heading, nav: calendar-nav, next: calendar-next, pad: calendar-pad, previous: calendar-previous, range-edge: calendar-range-edge, selected: calendar-selected, today: calendar-today, weekday: calendar-weekday" .min=${String(this.min ?? '').slice(0, 10)} .max=${String(this.max ?? '').slice(0, 10)} .locale=${this.locale} .range=${this.rangeMode} @change=${this.#onCalendarChange}></${tag}>`}
        ${extra}
        <div part="actions"><button part="cancel close" type="button" @click=${close}>${this.localize.term('cancel')}</button>${actions}</div>
      </div>
    </dialog>`;
  }

  /** A click that lands on the dialog itself (not its panel) is on the backdrop: close, as Escape does. */
  #onDialogClick = (/** @type {MouseEvent} */ event) => {
    if (event.target === this.dialog) /** @type {HTMLDialogElement} */ (this.dialog).close();
  };

  /** @override */
  render() {
    return html`${this.renderFields()}${this.renderDialog()}`;
  }
}
