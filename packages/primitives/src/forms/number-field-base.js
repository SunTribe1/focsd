import { html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { FocsdTextFieldBase } from '../text-field/text-field-base.js';
import { iconSvg } from '../internal/icons.js';
import { finiteOrUndefined } from '../internal/number.js';

/** @param {number | undefined} n */
const decimals = (n) => (String(n).split('.')[1] ?? '').length;

/**
 * Number field: APG spinbutton on a text input (no native number quirks), with labeled steppers.
 *
 * @fires input - Fired on every user edit of the value.
 * @fires change - Fired when the user commits a change to the value or state.
 * @csspart control - The control element.
 * @csspart decrement - The decrease button.
 * @csspart increment - The increase button.
 * @csspart spin - The row holding the input and both step buttons.
 * @csspart stepper - Both step buttons.
 */
export class FocsdNumberFieldBase extends FocsdTextFieldBase {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { min: { type: Number }, max: { type: Number }, step: { type: Number } };

  constructor() {
    super();
    /** @type {number | null | undefined} The smallest value allowed. */
    this.min = undefined;
    /** @type {number | null | undefined} The largest value allowed. */
    this.max = undefined;
    /** The amount the arrow keys and buttons add or subtract. */
    this.step = 1;
  }

  /**
   * The spinbutton input, not the decrement button that comes first in tree order.
   * @returns {HTMLElement | undefined}
   */
  get ariaTarget() {
    return this.renderRoot?.querySelector?.('[part~="control"]') ?? undefined;
  }

  /** The typed number, null when empty, NaN for anything a native number input rejects (hex, words). */
  get #number() {
    const text = this.value.trim();

    if (text === '') return null;

    return /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(text) ? Number(text) : NaN;
  }

  get #min() {
    return finiteOrUndefined(this.min);
  }

  get #max() {
    return finiteOrUndefined(this.max);
  }

  /**
   * @param {HTMLInputElement | HTMLTextAreaElement} input
   * @returns {import('../text-field/text-field-base.js').ValidityResult}
   * @override
   */
  computeValidity(input) {
    const n = this.#number;
    const [min, max] = [this.#min, this.#max];

    if (n !== null && Number.isNaN(n)) return [{ badInput: true }, this.localize.term('enterNumber')];

    if (n !== null && min !== undefined && n < min) return [{ rangeUnderflow: true }, this.localize.term('numberMin', min)];

    if (n !== null && max !== undefined && n > max) return [{ rangeOverflow: true }, this.localize.term('numberMax', max)];

    return [input.validity, input.validationMessage];
  }

  /** @param {number} next */
  #setNumber(next) {
    const [min, max] = [this.#min, this.#max];
    let value = next;

    if (min !== undefined) value = Math.max(min, value);

    if (max !== undefined) value = Math.min(max, value);
    value = Number(value.toFixed(Math.max(decimals(this.step), decimals(min ?? 0))));

    if (String(value) === /** @type {{ value: string }} */ (this).value) return;
    this.value = String(value);
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /** @param {number} count */
  #stepBy(count) {
    if (this.isDisabled) return;
    const n = this.#number;
    const base = n === null || Number.isNaN(n) ? (this.#min ?? 0) : n;
    this.#setNumber(base + count * this.step);
  }

  /** @param {KeyboardEvent} event */
  #onSpinKey(event) {
    /** @type {Record<string, number>} */
    const keys = { ArrowUp: 1, ArrowDown: -1, PageUp: 10, PageDown: -10 };

    if (event.key in keys) {
      event.preventDefault();
      this.#stepBy(/** @type {number} */ (keys[event.key]));
    } else if (event.key === 'Home' && this.#min !== undefined) {
      event.preventDefault();
      this.#setNumber(this.#min);
    } else if (event.key === 'End' && this.#max !== undefined) {
      event.preventDefault();
      this.#setNumber(this.#max);
    }
  }

  /** The value as a number (NaN when empty or invalid), like native number inputs. */
  get valueAsNumber() {
    const n = this.#number;

    return n === null ? Number.NaN : n;
  }
  set valueAsNumber(n) {
    this.value = Number.isFinite(n) ? String(n) : '';
  }

  /** Step the value up by `n` steps (clamped to min/max), without firing events, like native. */
  stepUp(n = 1) {
    this.#stepTo(n);
  }
  /** Step the value down by `n` steps (clamped to min/max), without firing events, like native. */
  stepDown(n = 1) {
    this.#stepTo(-n);
  }

  /** @param {number} steps */
  #stepTo(steps) {
    const step = Number(this.step) || 1;
    const current = Number.isFinite(this.#number) ? /** @type {number} */ (this.#number) : 0;
    let next = current + steps * step;
    const [min, max] = [this.#min, this.#max];

    if (min !== undefined) next = Math.max(min, next);

    if (max !== undefined) next = Math.min(max, next);
    this.value = String(Number(next.toFixed(10)));
  }

  /** @override @param {import('../text-field/text-field-base.js').ControlContext} ctx */
  renderControl(ctx) {
    const n = this.#number;

    /* eslint-disable lit-a11y/accessible-name -- named by <label for> in the same shadow root */
    return html`<div part="spin">
      <button part="stepper decrement" type="button" tabindex="-1" aria-label=${this.localize.term('decrease', this.label)} ?disabled=${this.isDisabled} @click=${() => this.#stepBy(-1)}>${iconSvg('minus')}</button>
      <input
        part="control"
        id=${ctx.id}
        type="text"
        inputmode="decimal"
        role="spinbutton"
        .value=${live(this.value)}
        aria-valuenow=${n === null || Number.isNaN(n) ? nothing : n}
        aria-valuemin=${this.#min ?? nothing}
        aria-valuemax=${this.#max ?? nothing}
        ?required=${this.required}
        ?disabled=${this.isDisabled}
        aria-describedby=${ctx.describedBy || nothing}
        @input=${ctx.onInput}
        @change=${ctx.onChange}
        @keydown=${(/** @type {KeyboardEvent} */ event) => {
          this.#onSpinKey(event);
          ctx.onKeyDown(event);
        }}
      />
      <button part="stepper increment" type="button" tabindex="-1" aria-label=${this.localize.term('increase', this.label)} ?disabled=${this.isDisabled} @click=${() => this.#stepBy(1)}>${iconSvg('plus')}</button>
    </div>`;
  }
  /* eslint-enable lit-a11y/accessible-name */
}
