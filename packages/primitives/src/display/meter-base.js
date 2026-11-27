import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { clamp } from '../internal/number.js';
import { indicator, indicatorStyles } from './indicator.js';

/**
 * Meter: role=meter with value text. `level` (optimum | suboptimal | poor) follows the HTML
 * <meter> algorithm and is reflected for styling; the value text keeps color from being the only signal.
 * The indicator part carries the filled fraction as `--_progress` (0–1).
 *
 * @csspart indicator - The indicator element.
 * @csspart track - The track element.
 * @csspart value-text - The value text element.
 */
export class FocsdMeterBase extends FocsdElement {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdElement.styles, indicatorStyles];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    value: { type: Number },
    min: { type: Number },
    max: { type: Number },
    low: { type: Number },
    high: { type: Number },
    optimum: { type: Number },
    label: {},
    valueText: { attribute: 'value-text' },
    level: { reflect: true },
  };

  constructor() {
    super();
    /** The value, between `min` and `max`. */
    this.value = 0;
    /** The lowest value. */
    this.min = 0;
    /** The highest value. */
    this.max = 1;
    /** @type {number | undefined} The top of the low range, as on `<meter low>`. */
    this.low = undefined;
    /** @type {number | undefined} The bottom of the high range, as on `<meter high>`. */
    this.high = undefined;
    /** @type {number | undefined} The best value, as on `<meter optimum>`; it decides which range is good. */
    this.optimum = undefined;
    /** The accessible name of the meter. */
    this.label = '';
    /** Text read for the value instead of the number, such as "3 of 10 GB". */
    this.valueText = '';
    /**
     * @type {'optimum' | 'suboptimal' | 'poor'}
     * How good the value is, from `low`, `high` and `optimum` as on `<meter>`. Set by the meter; reflected for styling.
     */
    this.level = 'optimum';
  }

  /** @override */
  willUpdate() {
    const min = this.min;
    const max = Math.max(this.max, min);
    const value = clamp(this.value, min, max);
    const low = clamp(this.low ?? min, min, max);
    const high = clamp(this.high ?? max, low, max);
    const optimum = clamp(this.optimum ?? (min + max) / 2, min, max);
    /** @type {FocsdMeterBase['level']} */
    let level;

    if (optimum < low) level = value < low ? 'optimum' : value <= high ? 'suboptimal' : 'poor';
    else if (optimum > high) level = value > high ? 'optimum' : value >= low ? 'suboptimal' : 'poor';
    else level = value >= low && value <= high ? 'optimum' : 'suboptimal';
    this.level = level;
  }

  /** @override */
  updated() {
    this.setAttribute('role', 'meter');
    this.setAttribute('aria-label', this.label);
    this.setAttribute('aria-valuemin', String(this.min));
    this.setAttribute('aria-valuemax', String(this.max));
    this.setAttribute('aria-valuenow', String(clamp(this.value, this.min, this.max)));

    if (this.valueText) this.setAttribute('aria-valuetext', this.valueText);
    else this.removeAttribute('aria-valuetext');
  }

  /** @override */
  render() {
    const span = this.max - this.min || 1;
    const fraction = (clamp(this.value, this.min, this.max) - this.min) / span;

    return html`<span part="track">${indicator(fraction)}</span>${
      this.valueText ? html`<span part="value-text" aria-hidden="true">${this.valueText}</span>` : nothing
    }`;
  }
}
