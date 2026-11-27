import { html, nothing } from 'lit';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import { FocsdElement } from '../internal/focsd-element.js';
import { formatIntl, intlOptions } from '../internal/count-up.js';
import { finiteOrUndefined } from '../internal/number.js';
import { deltaState, deltaText } from './stat-delta.js';

/** @typedef {import('./stat-delta.js').StatTrend} StatTrend */

/**
 * The delta's arrow, by trend (arrow-up, arrow-down and a flat dash; 24 × 24). From Lucide icons, ISC License, Copyright (c) 2026 Lucide Icons and Contributors (some derived from Feather, MIT, Copyright (c) 2013-present Cole Bemis); full text in LICENSE-lucide.txt in this package.
 */
const ARROWS = { up: 'M5 12l7-7 7 7M12 19V5', down: 'M12 5v14M19 12l-7 7-7-7', flat: 'M5 12h14' };

/** `delta` as an attribute: an empty one is not set (the default converter would make it 0, "no change"). */
/** @type {import('lit').ComplexAttributeConverter<number | undefined>} */
const optionalNumber = { fromAttribute: (value) => (value === null || value.trim() === '' ? undefined : Number(value)) };

/** The default delta format: a fraction shown as a percentage (0.12 → 12%). */
/** @type {Intl.NumberFormatOptions} */
const PERCENT = { style: 'percent', maximumFractionDigits: 1 };

/**
 * Stat: a key figure with its label, an optional change ("delta") and an optional chart. The tile
 * is a group named by its label; with `href` the label is a link.
 *
 * The delta is always in words, with an arrow beside them and a color from whether the change is
 * good news (`good`): "Up 12% from last period, good". `trend` comes from the sign of `delta`
 * unless set. A `value` that is not a number is shown as it is.
 *
 * With `animate` (property `animated`), the value counts to each new number (an animated number); screen readers get
 * only the final value.
 *
 * @slot chart - A small chart under the value, such as a `focsd-sparkline`.
 * @slot footer - A note at the bottom of the tile, such as when the figure was updated.
 * @csspart base - The tile: a group named by the label.
 * @csspart label - The label (a link with `href`).
 * @csspart value - The key figure.
 * @csspart delta - The change in words, with its arrow.
 * @csspart delta-icon - The arrow (hidden from assistive technology).
 * @csspart chart - The wrapper around the `chart` slot.
 * @csspart footer - The wrapper around the `footer` slot.
 */
export class FocsdStatBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    label: {},
    value: {},
    format: { converter: intlOptions },
    delta: { converter: optionalNumber },
    deltaFormat: { converter: intlOptions, attribute: 'delta-format' },
    trend: {},
    good: {},
    period: {},
    href: {},
    animated: { type: Boolean, attribute: 'animate' },
  };

  /** The animated number element rendered for `animate`. */
  static numberTag = 'focsd-animated-number';

  constructor() {
    super();
    /** What the figure is, such as "Revenue": the tile's name. */
    this.label = '';
    /** @type {number | string} The key figure: a number (formatted with `format`) or text shown as it is. */
    this.value = '';
    /** @type {Intl.NumberFormatOptions | undefined} `Intl.NumberFormat` options for `value`; as an attribute, JSON. */
    this.format = undefined;
    /** @type {number | undefined} The change since `period`: with the default `delta-format`, a fraction (0.12 is 12%). */
    this.delta = undefined;
    /** @type {Intl.NumberFormatOptions | undefined} `Intl.NumberFormat` options for the delta (default: a percentage). */
    this.deltaFormat = undefined;
    /** @type {StatTrend | ''} The direction of the change; by default the sign of `delta`. */
    this.trend = '';
    /** @type {'up' | 'down'} The direction that is good news (`down` for costs or churn). */
    this.good = 'up';
    /** What the change is measured against, read as "Up 12% from {period}"; "last period" by default. */
    this.period = '';
    /** Makes the label a link to this URL. */
    this.href = '';
    /**
     * Counts the value to each new number (no counting under reduced motion). The attribute is `animate`;
     * the property is `animated`, since `animate()` is a method every element has.
     */
    this.animated = false;
  }

  /** @param {Event} event */
  #toggleEmpty = (event) => {
    const slot = /** @type {HTMLSlotElement} */ (event.target);
    /** @type {HTMLElement} */ (slot.parentElement).hidden = slot.assignedNodes({ flatten: true }).length === 0;
  };

  #label() {
    return this.href ? html`<a href=${this.href}>${this.label}</a>` : this.label;
  }

  #value() {
    // Blank text is not 0 (Number(' ') is).
    const n = String(this.value ?? '').trim() === '' ? undefined : finiteOrUndefined(this.value);

    if (n === undefined) return this.value;

    if (!this.animated) return formatIntl(n, this.format, this.localize.locale());
    const tag = unsafeStatic(/** @type {typeof FocsdStatBase} */ (this.constructor).numberTag);

    return staticHtml`<${tag} .value=${n} .format=${this.format}></${tag}>`;
  }

  #delta() {
    const state = deltaState(this.delta, this.trend, this.good);

    if (!state) return nothing;
    const locale = this.localize.locale();
    const options = this.deltaFormat ?? PERCENT;
    const amount = formatIntl(Math.abs(Number(this.delta)), options, locale);
    // A change that rounds to nothing ("Up 0%") is no change; an explicit `trend` is the author's call.
    const level = !this.trend && amount === formatIntl(0, options, locale);

    const shown = level ? /** @type {import('./stat-delta.js').DeltaState} */ ({ trend: 'flat', judgement: 'neutral' }) : state;

    return html`<div part="delta" data-judgement=${shown.judgement}>
      <svg part="delta-icon" aria-hidden="true" viewBox="0 0 24 24"><path d=${ARROWS[shown.trend]}></path></svg
      ><span>${deltaText(this.localize.term.bind(this.localize), shown, amount, this.period)}</span>
    </div>`;
  }

  /** @override */
  render() {
    return html`<div part="base" role="group" aria-labelledby="label">
      <div part="label" id="label">${this.#label()}</div>
      <div part="value">${this.#value()}</div>
      ${this.#delta()}
      <div part="chart" hidden><slot name="chart" @slotchange=${this.#toggleEmpty}></slot></div>
      <div part="footer" hidden><slot name="footer" @slotchange=${this.#toggleEmpty}></slot></div>
    </div>`;
  }
}
