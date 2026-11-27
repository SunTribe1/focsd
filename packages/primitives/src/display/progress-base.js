import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { clamp } from '../internal/number.js';
import { indicator, indicatorStyles } from './indicator.js';

/**
 * Progress: role=progressbar, drawn as a bar or (with `variant="ring"`) a circle; `indeterminate`
 * omits aria-valuenow. The bar's indicator part carries the filled fraction as `--_progress` (0–1);
 * the ring's arc is a `stroke-dasharray` on a circle whose path length is 100.
 *
 * @csspart indicator - The bar's indicator element.
 * @csspart track - The bar's track element.
 * @csspart ring - The ring variant's box, holding the circle and the value.
 * @csspart ring-track - The ring's full circle behind the arc (a band between two thin outlines, as the bar's track).
 * @csspart ring-indicator - The ring's arc, as long as the value.
 * @csspart value - The ring's value as a percentage, shown with `show-value` (hidden from assistive technology, which reads aria-valuenow).
 */
export class FocsdProgressBase extends FocsdElement {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdElement.styles, indicatorStyles];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    value: { type: Number },
    max: { type: Number },
    label: {},
    indeterminate: { type: Boolean, reflect: true },
    variant: { reflect: true },
    showValue: { type: Boolean, attribute: 'show-value' },
  };

  constructor() {
    super();
    /** The progress, between 0 and `max`. */
    this.value = 0;
    /** The value that means complete. */
    this.max = 100;
    /** The accessible name of the progress bar. */
    this.label = '';
    /** Shows progress of unknown length; `value` is ignored. */
    this.indeterminate = false;
    /** @type {'bar' | 'ring'} How the progress is drawn: a horizontal bar or a circle. */
    this.variant = 'bar';
    /** Shows the value as a percentage in the center of the ring (ring variant only; not while indeterminate). */
    this.showValue = false;
  }

  /** @override */
  updated() {
    this.setAttribute('role', 'progressbar');
    this.setAttribute('aria-label', this.label);
    this.setAttribute('aria-valuemin', '0');
    this.setAttribute('aria-valuemax', String(this.max));

    if (this.indeterminate) this.removeAttribute('aria-valuenow');
    else this.setAttribute('aria-valuenow', String(clamp(this.value, 0, this.max)));
  }

  /** @override */
  render() {
    const fraction = this.indeterminate ? 1 : this.max > 0 ? clamp(this.value, 0, this.max) / this.max : 0;

    return this.variant === 'ring' ? this.#ring(fraction) : html`<span part="track">${indicator(fraction)}</span>`;
  }

  /**
   * The ring: a track band with an outline on each side, an arc of `fraction` over it (a quarter while
   * indeterminate), and the value.
   * @param {number} fraction 0–1
   */
  #ring(fraction) {
    const arc = this.indeterminate ? 25 : fraction * 100;

    const value =
      this.showValue && !this.indeterminate
        ? html`<span part="value" aria-hidden="true">${new Intl.NumberFormat(this.localize.locale(), { style: 'percent' }).format(fraction)}</span>`
        : nothing;

    return html`<span part="ring"
      ><svg viewBox="0 0 36 36" aria-hidden="true">
        <circle part="ring-track" cx="18" cy="18" r="16"></circle>
        <circle class="edge" cx="18" cy="18" r="17.6"></circle>
        <circle class="edge" cx="18" cy="18" r="14.4"></circle>
        <circle part="ring-indicator" cx="18" cy="18" r="16" pathLength="100" stroke-dasharray="${arc} 100"></circle></svg
      >${value}</span
    >`;
  }
}
