import { css, html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { FocsdElement } from '../internal/focsd-element.js';
import { FormControlMixin, restoredText } from '../internal/form-control.js';
import { uid } from '../internal/id.js';
import { renderFieldLayout } from '../internal/field-messages.js';

/**
 * One-time code: a labeled group of single-digit cells. Cells keep their position (clearing one
 * never shifts the others); typing advances, Backspace goes back, paste or SMS autofill fills.
 *
 * @fires input - Fired on every user edit of the value.
 * @csspart layout - The wrapper that places the label, the body and the messages.
 * @csspart body - The group of cells, with the hint and message below it.
 * @csspart cell - The cell element.
 * @csspart control - The control element.
 * @csspart group - The group element.
 * @csspart label - The label element.
 * @csspart hint - The author's hint.
 * @csspart message - The shown error, warning or success message.
 * @csspart message-icon - The icon in the message.
 * @csspart announcer - The visually hidden live region.
 */
export class FocsdOtpFieldBase extends FormControlMixin(FocsdElement) {
  // Codes read digit by digit left to right in every script, so cells (and arrows) stay LTR.
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdElement.styles, css`[part~='group'] { direction: ltr; unicode-bidi: isolate; }`];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { label: {}, length: { type: Number }, value: {}, autocomplete: {} };

  #labelId = uid('focsd-otp-label');

  /** Fixed-length cell contents; `value` is derived from it. */
  /** @type {string[]} */
  #cells = [];

  #syncingFromCells = false;

  constructor() {
    super();
    /** The visible label. */
    this.label = '';
    /** The number of characters in the code. */
    this.length = 6;
    /** The code typed so far. */
    this.value = '';
    /** @type {AutoFill} Autofill token for the first cell; `one-time-code` lets browsers fill SMS codes. */
    this.autocomplete = 'one-time-code';
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
  }

  /** The group carries the name, description and invalid state, not its first cell. */
  get ariaTarget() {
    return this.renderRoot?.querySelector?.('[part~="group"]') ?? undefined;
  }

  get #inputs() {
    return [...this.renderRoot.querySelectorAll('input')];
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  willUpdate(changed) {
    if ((changed.has('value') || changed.has('length')) && !this.#syncingFromCells) {
      this.#cells = Array.from({ length: this.length }, (_, i) => (this.value ?? '')[i] ?? '');
    }

    this.#syncingFromCells = false;
  }

  #commit() {
    this.#syncingFromCells = true;
    this.value = this.#cells.join('');
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }

  /**
   * Write digits into cells starting at `start`; returns the index after the last written cell.
   * @param {number} start
   * @param {string[]} digits
   * @returns {number}
   */
  #fill(start, digits) {
    let i = start;

    for (const d of digits) {
      if (i >= this.length) break;
      this.#cells[i] = d;
      i += 1;
    }

    this.#commit();

    return i;
  }

  /** @override */
  updated() {
    this.internals.setFormValue(this.value || null);
    const first = this.#inputs[0];
    const filled = this.#cells.filter(Boolean).length;

    if (this.required && filled === 0) this.setValidityState({ valueMissing: true }, this.localize.term('enterCode'), first);
    else if (filled > 0 && filled < this.length)
      this.setValidityState({ tooShort: true }, this.localize.term('enterAllDigits', this.length), first);
    else this.setValidityState({});
  }

  formResetCallback() {
    this.value = this.defaultValue;
  }

  /** @param {string | File | FormData | null} state */
  formStateRestoreCallback(state) {
    this.value = restoredText(state) ?? '';
  }

  /**
   * @param {number} index
   * @param {Event} event
   */
  #onInput(index, event) {
    const input = /** @type {HTMLInputElement} */ (event.target);
    const digits = input.value.replaceAll(/\D/g, '');

    if (digits.length > 1) {
      // Autofill or a fast typist: spread from this cell onwards.
      const end = this.#fill(index, digits.split(''));
      this.updateComplete.then(() => this.#inputs[Math.min(end, this.length - 1)]?.focus());

      return;
    }

    this.#cells[index] = digits;
    input.value = digits;
    this.#commit();

    if (digits && index < this.length - 1) this.#inputs[index + 1]?.focus();
  }

  /**
   * @param {number} index
   * @param {KeyboardEvent} event
   */
  #onKeyDown(index, event) {
    if (event.key === 'Backspace' && !(/** @type {HTMLInputElement} */ (event.target).value) && index > 0) {
      event.preventDefault();
      this.#cells[index - 1] = '';
      this.#commit();
      this.#inputs[index - 1]?.focus();
    } else if (event.key === 'ArrowLeft' && index > 0) {
      this.#inputs[index - 1]?.focus();
    } else if (event.key === 'ArrowRight' && index < this.length - 1) {
      this.#inputs[index + 1]?.focus();
    }
  }

  /** @param {ClipboardEvent} event */
  #onPaste = (event) => {
    const digits = (event.clipboardData?.getData('text/plain') ?? '').replaceAll(/\D/g, '');

    if (!digits) return;
    event.preventDefault();
    this.#cells = Array.from({ length: this.length }, () => '');
    const end = this.#fill(0, digits.split(''));
    this.updateComplete.then(() => this.#inputs[Math.min(end, this.length - 1)]?.focus());
  };

  /** @override */
  render() {
    const label = html`<span part="label" id=${this.#labelId}>${this.label}</span>`;

    const body = html`<div part="group" role="group" aria-labelledby=${this.#labelId} aria-describedby=${this.describedByIds().join(' ') || nothing} @paste=${this.#onPaste}>
        ${this.#cells.map(
          (digit, i) => html`<input
          part="control cell"
          type="text"
          inputmode="numeric"
          autocomplete=${i === 0 ? this.autocomplete || 'off' : 'off'}
          aria-label=${this.localize.term('digitOf', i + 1, this.length)}
          .value=${live(digit)}
          ?disabled=${this.isDisabled}
          @input=${(/** @type {Event} */ event) => this.#onInput(i, event)}
          @keydown=${(/** @type {KeyboardEvent} */ event) => this.#onKeyDown(i, event)}
        />`,
        )}
      </div>`;

    return renderFieldLayout(this, label, body);
  }
}
