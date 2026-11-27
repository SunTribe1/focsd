import { html, nothing } from 'lit';
import { deprecated } from '../internal/deprecate.js';
import { FocsdElement } from '../internal/focsd-element.js';
import { FormControlMixin } from '../internal/form-control.js';
import { iconSvg } from '../internal/icons.js';
import { uid } from '../internal/id.js';
import { renderFieldLayout } from '../internal/field-messages.js';

/**
 * Star rating: a radiogroup of named stars; `readonly` renders a single labeled image.
 *
 * @fires input - Fired on every user edit of the value.
 * @fires change - Fired when the user commits a change to the value or state.
 * @csspart layout - The wrapper that places the label, the body and the messages.
 * @csspart body - The stars, with the hint and message below them.
 * @csspart filled - Added to each star at or below the value.
 * @csspart label - The label element.
 * @csspart star - One star.
 * @csspart stars - The row of stars.
 * @csspart hint - The author's hint.
 * @csspart message - The shown error, warning or success message.
 * @csspart message-icon - The icon in the message.
 * @csspart announcer - The visually hidden live region.
 */
export class FocsdRatingBase extends FormControlMixin(FocsdElement) {
  /** `readonly` applies here (no edits, barred from validation), as on native text-like inputs. */
  static supportsReadOnly = true;

  /**
   * Deprecated: use `readOnly` (the `readonly` attribute is unchanged).
   * @deprecated Use `readOnly` (the `readonly` attribute is unchanged).
   */
  get readonly() {
    deprecated('rating.readonly', 'focsd-rating `readonly` property', 'use `readOnly`');

    return this.readOnly;
  }
  set readonly(value) {
    deprecated('rating.readonly', 'focsd-rating `readonly` property', 'use `readOnly`');
    this.readOnly = value;
  }

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { label: {}, value: { type: Number }, max: { type: Number } };

  #labelId = uid('focsd-rating-label');

  constructor() {
    super();
    /** The visible label. */
    this.label = '';
    /** The rating, from 0 (none) to `max`. */
    this.value = 0;
    /** The highest rating. */
    this.max = 5;
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
  }

  /** @override */
  updated() {
    this.internals.setFormValue(this.readOnly || !this.value ? null : String(this.value));

    if (this.required && !this.value && !this.readOnly)
      this.setValidityState({ valueMissing: true }, this.localize.term('chooseRating'), this.renderRoot.querySelector('[role="radio"]'));
    else this.setValidityState({});
  }

  /** @param {string | File | FormData | null} state */
  formStateRestoreCallback(state) {
    this.value = Number(state) || 0;
  }

  formResetCallback() {
    this.value = Number(this.defaultValue) || 0;
  }

  /** @param {number} value */
  #choose(value) {
    if (this.isDisabled) return;
    const next = Math.min(this.max, Math.max(1, value));
    this.updateComplete.then(() => /** @type {HTMLElement} */ (this.renderRoot.querySelector(`[data-value="${next}"]`))?.focus());

    if (next === this.value) return;
    this.value = next;
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /** @param {KeyboardEvent} event */
  #onKeyDown(event) {
    const rtl = getComputedStyle(this).direction === 'rtl';
    const current = this.value || 0;
    /** @type {Record<string, number>} */
    const map = { ArrowDown: -1, ArrowUp: 1, ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 };

    const next = current + (map[event.key] ?? 0);

    if (event.key in map) this.#choose(next < 1 ? this.max : next > this.max ? 1 : next);
    else if (event.key === 'Home') this.#choose(1);
    else if (event.key === 'End') this.#choose(this.max);
    else if (event.key === ' ') this.#choose(Number(/** @type {HTMLElement} */ (event.target).dataset.value));
    else return;
    event.preventDefault();
  }

  /** @override */
  render() {
    const stars = Array.from({ length: this.max }, (_, i) => i + 1);

    if (this.readOnly) {
      return renderFieldLayout(
        this,
        html`<span part="label" aria-hidden="true">${this.label}</span>`,
        html`<span part="stars" role="img" aria-label=${this.localize.term('ratingValue', this.label, this.value, this.max)} aria-describedby=${this.describedByIds().join(' ') || nothing}>
          ${stars.map((n) => html`<span part="star ${n <= this.value ? 'filled' : ''}">${iconSvg('star')}</span>`)}
        </span>`,
      );
    }

    const stop = this.value || 1;

    /* eslint-disable lit-a11y/click-events-have-key-events -- stars are radios; the radiogroup handles arrow keys and Space */
    const label = html`<span part="label" id=${this.#labelId}>${this.label}</span>`;

    const body = html`<span part="stars" role="radiogroup" aria-labelledby=${this.#labelId} aria-describedby=${this.describedByIds().join(' ') || nothing} aria-disabled=${this.isDisabled ? 'true' : nothing} @keydown=${this.#onKeyDown}>
        ${stars.map(
          (n) => html`<span
          part="star ${n <= this.value ? 'filled' : ''}"
          role="radio"
          data-value=${n}
          aria-checked=${String(n === this.value)}
          aria-label=${this.localize.term('starCount', n)}
          tabindex=${n === stop && !this.isDisabled ? '0' : '-1'}
          @click=${() => this.#choose(n)}
        >${iconSvg('star')}</span>`,
        )}
      </span>`;

    return renderFieldLayout(this, label, body);
  }
  /* eslint-enable lit-a11y/click-events-have-key-events */
}
