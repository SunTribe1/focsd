import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { FormControlMixin, restoredText } from '../internal/form-control.js';
import { uid } from '../internal/id.js';
import { renderFieldLayout } from '../internal/field-messages.js';
import { clamp } from '../internal/number.js';
import { cssomStyle } from '../internal/style.js';

/** @typedef {'value' | 'valueLow' | 'valueHigh'} ThumbKey */

/**
 * Slider (single or range): role=slider thumbs with value text, keyboard and pointer support.
 *
 * @fires input - Fired on every user edit of the value.
 * @fires change - Fired when the user commits a change to the value or state.
 * @csspart layout - The wrapper that places the label, the body and the messages.
 * @csspart body - The track, with the hint and message below it.
 * @csspart fill - The fill element.
 * @csspart header - The label and value row (above the track), or only the value when the label sits beside.
 * @csspart label - The label element.
 * @csspart output - The visible value next to the label.
 * @csspart hint - The author's hint.
 * @csspart message - The shown error, warning or success message.
 * @csspart message-icon - The icon in the message.
 * @csspart announcer - The visually hidden live region.
 * @csspart thumb - The thumb element.
 * @csspart track - The track element.
 */
export class FocsdSliderBase extends FormControlMixin(FocsdElement) {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    label: {},
    value: { type: Number },
    min: { type: Number },
    max: { type: Number },
    step: { type: Number },
    range: { type: Boolean, reflect: true },
    valueLow: { type: Number, attribute: 'value-low' },
    valueHigh: { type: Number, attribute: 'value-high' },
    valueText: { attribute: 'value-text' },
  };

  #labelId = uid('focsd-slider-label');

  /** @type {{ value: number, valueLow: number, valueHigh: number } | null} */
  #defaults = null;

  /**
   * Thumb being dragged, or null.
   * @type {ThumbKey | null}
   */
  #dragging = null;

  constructor() {
    super();
    /** The visible label. */
    this.label = '';
    /** The value. */
    this.value = 50;
    /** The lowest value. */
    this.min = 0;
    /** The highest value. */
    this.max = 100;
    /** The amount each step moves. */
    this.step = 1;
    /** Shows two thumbs that set `value-low` and `value-high`. */
    this.range = false;
    /** With `range`, the lower value. */
    this.valueLow = 0;
    /** With `range`, the higher value. */
    this.valueHigh = 100;
    /** Text read for the value instead of the number, such as "Medium". */
    this.valueText = '';
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();

    if (!this.hasUpdated)
      queueMicrotask(() => {
        this.#defaults = { value: this.value, valueLow: this.valueLow, valueHigh: this.valueHigh };
      });
  }

  /** @override */
  willUpdate() {
    if (!this.hasUpdated) {
      if (!this.hasAttribute('value')) this.value = this.min + (this.max - this.min) / 2;

      if (!this.hasAttribute('value-low')) this.valueLow = this.min;

      if (!this.hasAttribute('value-high')) this.valueHigh = this.max;
    }

    /** @type {(v: number, lo: number, hi: number) => number} */
    const clampSnap = (v, lo, hi) => clamp(this.#snap(v), lo, hi);
    this.value = clampSnap(this.value, this.min, this.max);
    this.valueLow = clampSnap(this.valueLow, this.min, this.max);
    this.valueHigh = clampSnap(this.valueHigh, this.valueLow, this.max);
  }

  /** @param {number} value */
  #text(value) {
    return this.valueText ? this.valueText.replaceAll('{value}', String(value)) : String(value);
  }

  /** The value as a number (single-thumb mode), like native range inputs. */
  get valueAsNumber() {
    return this.value;
  }
  set valueAsNumber(value) {
    this.value = Number(value);
  }

  /** Move the value up by `n` steps, clamped to the range. Fires no events, like native. */
  stepUp(n = 1) {
    this.value = clamp(this.#snap(this.value + n * this.step), this.min, this.max);
  }

  /** Move the value down by `n` steps, clamped to the range. Fires no events, like native. */
  stepDown(n = 1) {
    this.stepUp(-n);
  }

  /** @param {number} value */
  #snap(value) {
    const stepped = Math.round((value - this.min) / this.step) * this.step + this.min;

    return Number(stepped.toFixed(6));
  }

  /**
   * @param {ThumbKey} key
   * @returns {[number, number]}
   */
  #bounds(key) {
    if (key === 'valueLow') return [this.min, this.valueHigh];

    if (key === 'valueHigh') return [this.valueLow, this.max];

    return [this.min, this.max];
  }

  /**
   * Set a value from the user. `change` fires per key press, but only once at the end of a drag.
   * @param {ThumbKey} key
   * @param {number} raw
   * @param {{ commit?: boolean }} [options]
   */
  #set(key, raw, { commit = true } = {}) {
    const [lo, hi] = this.#bounds(key);
    const next = clamp(this.#snap(raw), lo, hi);

    if (next === this[key]) return;
    this[key] = next;
    this.emitValue(commit);
  }

  /** @override */
  updated() {
    if (this.range) {
      const data = new FormData();
      data.append(this.name, String(this.valueLow));
      data.append(this.name, String(this.valueHigh));
      this.internals.setFormValue(this.name ? data : null);
    } else {
      this.internals.setFormValue(String(this.value));
    }
  }

  formResetCallback() {
    if (this.#defaults) Object.assign(this, this.#defaults);
  }

  /** @param {string | File | FormData | null} state */
  formStateRestoreCallback(state) {
    if (this.range && state instanceof FormData) {
      const [low = NaN, high = NaN] = state.getAll(this.name).map(Number);

      if (Number.isFinite(low)) this.valueLow = low;

      if (Number.isFinite(high)) this.valueHigh = high;
    } else {
      const text = restoredText(state);

      if (text !== null && Number.isFinite(Number(text))) this.value = Number(text);
    }
  }

  /**
   * @param {ThumbKey} key
   * @param {KeyboardEvent} event
   */
  #onKeyDown(key, event) {
    if (this.isDisabled) return;
    const rtl = getComputedStyle(this).direction === 'rtl';
    const big = this.step * 10;

    /** @type {Record<string, number>} */
    const deltas = {
      ArrowUp: this.step,
      ArrowDown: -this.step,
      ArrowRight: rtl ? -this.step : this.step,
      ArrowLeft: rtl ? this.step : -this.step,
      PageUp: big,
      PageDown: -big,
    };

    const [lo, hi] = this.#bounds(key);

    if (event.key in deltas) this.#set(key, this[key] + /** @type {number} */ (deltas[event.key]));
    else if (event.key === 'Home') this.#set(key, lo);
    else if (event.key === 'End') this.#set(key, hi);
    else return;
    event.preventDefault();
  }

  /** @param {number} clientX */
  #valueAt(clientX) {
    const rect = /** @type {HTMLElement} */ (this.renderRoot.querySelector('[part~="track"]')).getBoundingClientRect();
    let ratio = clamp((clientX - rect.left) / rect.width, 0, 1);

    if (getComputedStyle(this).direction === 'rtl') ratio = 1 - ratio;

    return this.min + ratio * (this.max - this.min);
  }

  /** @param {PointerEvent} event */
  #onPointerDown = (event) => {
    if (this.isDisabled || event.button !== 0) return;
    const value = this.#valueAt(event.clientX);
    /** @type {ThumbKey} */
    let key = 'value';
    this.#tie = false;

    if (this.range) {
      // Thumbs on the same value: take the one that can move toward the pointer. Exactly on the
      // shared value, wait for the first move to see which way the drag goes.
      if (this.valueLow === this.valueHigh) {
        const shared = this.valueHigh;
        this.#tie = Math.abs(value - shared) < (this.step || 1) / 2;
        key = value > shared ? 'valueHigh' : 'valueLow';
      } else key = Math.abs(value - this.valueLow) <= Math.abs(value - this.valueHigh) ? 'valueLow' : 'valueHigh';
    }

    this.#dragging = key;
    this.#dragStart = this[key];
    this.#set(key, value, { commit: false });
    /** @type {HTMLElement} */ (event.currentTarget).setPointerCapture(event.pointerId);
    this.updateComplete.then(() => /** @type {HTMLElement} */ (this.renderRoot.querySelector(`[data-key="${key}"]`))?.focus());
    event.preventDefault();
  };

  /** @type {number | null} */
  #dragStart = null;

  #tie = false;

  /** @param {PointerEvent} event */
  #onPointerMove = (event) => {
    if (!this.#dragging) return;
    const value = this.#valueAt(event.clientX);

    if (this.#tie && value !== this.valueHigh) {
      this.#tie = false;
      this.#dragging = value > this.valueHigh ? 'valueHigh' : 'valueLow';
      this.#dragStart = this[this.#dragging];
      /** @type {HTMLElement} */ (this.renderRoot.querySelector(`[data-key="${this.#dragging}"]`))?.focus();
    }

    this.#set(this.#dragging, value, { commit: false });
  };

  #onPointerUp = () => {
    const key = this.#dragging;
    this.#dragging = null;

    if (key && this[key] !== this.#dragStart) this.dispatchEvent(new Event('change', { bubbles: true }));
  };

  /** @param {number} value */
  #pct(value) {
    return ((value - this.min) / (this.max - this.min || 1)) * 100;
  }

  /**
   * @param {ThumbKey} key
   * @param {string} [name]
   */
  #thumb(key, name) {
    const [lo, hi] = this.#bounds(key);
    const value = this[key];

    return html`<span
      part="thumb"
      data-key=${key}
      role="slider"
      tabindex=${this.isDisabled ? '-1' : '0'}
      aria-label=${name ?? nothing}
      aria-labelledby=${name ? nothing : this.#labelId}
      aria-valuemin=${lo}
      aria-valuemax=${hi}
      aria-valuenow=${value}
      aria-valuetext=${this.#text(value)}
      aria-describedby=${this.describedByIds().join(' ') || nothing}
      aria-disabled=${this.isDisabled ? 'true' : nothing}
      style=${cssomStyle({ 'inset-inline-start': `${this.#pct(value)}%` })}
      @keydown=${(/** @type {KeyboardEvent} */ event) => this.#onKeyDown(key, event)}
    ></span>`;
  }

  /** @override */
  render() {
    const [start, end] = this.range ? [this.#pct(this.valueLow), this.#pct(this.valueHigh)] : [0, this.#pct(this.value)];
    const shown = this.range ? `${this.#text(this.valueLow)} – ${this.#text(this.valueHigh)}` : this.#text(this.value);

    const top = this.effectiveLabelPosition === 'top';
    const label = html`<span part="label" id=${this.#labelId}>${this.label}</span>`;
    const output = html`<span part="output" aria-hidden="true">${shown}</span>`;
    // Above the track the header (label and value) is the layout label; beside it only the label moves.
    const layoutLabel = top ? html`<div part="header">${label}${output}</div>` : label;

    const body = html`${top ? nothing : html`<div part="header">${output}</div>`}<div part="track" @pointerdown=${this.#onPointerDown} @pointermove=${this.#onPointerMove} @pointerup=${this.#onPointerUp} @pointercancel=${this.#onPointerUp}>
        <span part="fill" style=${cssomStyle({ 'inset-inline-start': `${start}%`, 'inline-size': `${end - start}%` })}></span>
        ${
          this.range
            ? html`${this.#thumb('valueLow', this.localize.term('minimumOf', this.label))}${this.#thumb('valueHigh', this.localize.term('maximumOf', this.label))}`
            : this.#thumb('value')
        }
      </div>`;

    return renderFieldLayout(this, layoutLabel, body);
  }
}
