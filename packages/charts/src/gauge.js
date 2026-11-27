import { css, html, nothing, svg } from 'lit';
import { FocsdElement } from '@focsd/primitives';
import { intlOptions, warnOnce } from '@focsd/primitives/internal';
import { numberFormat } from './format.js';
import { arcPath } from './scale.js';

/** @typedef {{ to: number, label: string, tone?: 'positive' | 'caution' | 'critical' | 'neutral' }} GaugeBand */

const SWEEP = (4 * Math.PI) / 3;
const START = -SWEEP / 2;
const C = 50;

/**
 * The band a value falls in: the first (sorted by `to`) whose upper edge is at or above it.
 * @param {GaugeBand[] | null | undefined} bands
 * @param {number} value
 * @returns {GaugeBand | null}
 */
export const bandAt = (bands, value) => (bands ?? []).toSorted((a, b) => a.to - b.to).find((b) => value <= b.to) ?? null;

/** Angle (radians from the top, clockwise) of `value` on the 240 degree arc; clamped to the range. */
export const gaugeAngle = (/** @type {number} */ value, /** @type {number} */ min, /** @type {number} */ max) =>
  START + (max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0) * SWEEP;

/** @param {number} r @param {number} a */
const at = (r, a) => `${(C + r * Math.sin(a)).toFixed(2)} ${(C - r * Math.cos(a)).toFixed(2)}`;

/**
 * Gauge: one value on a 240 degree arc, a `meter`. Bands (ranges with a label and a tone) are drawn
 * on an outer ring with a tick between them and named in a list, and the current band is part of the
 * value text ("72%, Warning"), so no meaning is carried by color alone.
 *
 * @csspart gauge - The wrapper.
 * @csspart arc - The filled part of the dial, up to the value.
 * @csspart track - The whole dial behind it.
 * @csspart band - Each band on the outer ring.
 * @csspart tick - The mark between two bands.
 * @csspart needle - The pointer.
 * @csspart value - The value as text, shown with `show-value`.
 * @csspart label - The label under the dial.
 * @csspart legend - The list of bands.
 * @cssprop --focsd-gauge-size - The width (default `10rem`).
 * @cssprop --focsd-chart-1 - The color of the filled arc without bands (default `--focsd-route`).
 */
export class FocsdGauge extends FocsdElement {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdElement.styles,
    css`
      :host {
        display: inline-block;
        inline-size: var(--focsd-gauge-size, 10rem);
        color: var(--focsd-ink);
        font-size: var(--focsd-text-small-size);
        --_chart-1: var(--focsd-chart-1, var(--focsd-route));
      }
      [role='meter'] {
        position: relative;
      }
      [part~='gauge'] {
        display: grid;
        gap: var(--focsd-space-2);
      }
      svg {
        display: block;
        inline-size: 100%;
      }
      [part~='track'] {
        fill: var(--focsd-edge-quiet);
      }
      [part~='arc'] {
        fill: var(--_chart-1);
      }
      [part~='tick'],
      [part~='needle'] {
        stroke: var(--focsd-ink);
        stroke-width: 1.5;
        stroke-linecap: round;
      }
      .hub {
        fill: var(--focsd-ink);
      }
      [data-tone='positive'] {
        --tone: var(--focsd-positive);
      }
      [data-tone='caution'] {
        --tone: var(--focsd-caution);
      }
      [data-tone='critical'] {
        --tone: var(--focsd-critical);
      }
      [data-tone] {
        --_chart-1: var(--tone, var(--focsd-ink-muted));
      }
      [part~='band'] {
        fill: var(--_chart-1);
      }
      .read {
        position: absolute;
        inset-inline: 0;
        inset-block-start: 58%;
        display: grid;
        justify-items: center;
        text-align: center;
      }
      [part~='value'] {
        font-size: var(--focsd-text-body-size);
        font-weight: var(--focsd-text-label-weight);
      }
      [part~='label'] {
        color: var(--focsd-ink-muted);
      }
      ul {
        display: flex;
        flex-wrap: wrap;
        gap: var(--focsd-space-1) var(--focsd-space-3);
        margin: 0;
        padding: 0;
        list-style: none;
        justify-content: center;
      }
      li::before {
        content: '';
        display: inline-block;
        inline-size: 0.75em;
        block-size: 0.75em;
        margin-inline-end: 0.35em;
        background: var(--_chart-1);
      }
      li[aria-current] {
        font-weight: var(--focsd-text-label-weight);
        text-decoration: underline;
      }
      @media (forced-colors: active) {
        [part~='track'] {
          fill: GrayText;
        }
        [part~='arc'] {
          forced-color-adjust: none;
          fill: Highlight;
        }
        [part~='band'],
        .hub,
        li::before {
          forced-color-adjust: none;
          fill: CanvasText;
          background: CanvasText;
        }
        [part~='tick'],
        [part~='needle'] {
          stroke: CanvasText;
        }
      }
    `,
  ];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    value: { type: Number },
    min: { type: Number },
    max: { type: Number },
    label: {},
    format: { converter: intlOptions },
    bands: { attribute: false },
    showValue: { type: Boolean, attribute: 'show-value' },
  };

  constructor() {
    super();
    /** The value. It is kept inside `min` and `max`. */
    this.value = 0;
    /** The value at the start of the arc. */
    this.min = 0;
    /** The value at the end of the arc. */
    this.max = 100;
    /** The accessible name. */
    this.label = '';
    /** @type {Intl.NumberFormatOptions | undefined} Number format options for the value, as for `Intl.NumberFormat`; as an attribute, a short form (`format="percent"`, `format="currency USD"`) or JSON. */
    this.format = undefined;
    /** @type {GaugeBand[]} Ranges from the previous band's `to` (or `min`) up to `to`, each with a label and a tone. */
    this.bands = [];
    /** Shows the value as text in the dial. */
    this.showValue = false;
  }

  /** @override */
  render() {
    const lo = Number.isFinite(this.min) ? this.min : 0;
    const hi = Number.isFinite(this.max) && this.max > lo ? this.max : lo + 1;
    const now = Math.min(hi, Math.max(lo, Number.isFinite(this.value) ? this.value : lo));
    const fmt = numberFormat(this.localize.locale(), this.format, 'focsd-gauge');
    const bands = (Array.isArray(this.bands) ? this.bands : []).toSorted((a, b) => a.to - b.to);
    const band = bandAt(bands, now);
    const text = fmt.format(now);
    const angle = gaugeAngle(now, lo, hi);
    const a = (/** @type {number} */ v) => gaugeAngle(v, lo, hi);
    let from = lo;

    if (!this.label) warnOnce('gauge-label', 'focsd-gauge needs a label: set the label attribute.');

    const segments = bands.map((b) => {
      const start = from;
      from = Math.max(from, Math.min(b.to, hi));

      return from > start
        ? svg`<path part="band" data-tone=${b.tone ?? 'neutral'} d=${arcPath(C, C, 48, 45, a(start), a(from))}></path>`
        : nothing;
    });

    return html`<div part="gauge">
      <div role="meter" aria-label=${this.label} aria-valuemin=${lo} aria-valuemax=${hi} aria-valuenow=${now} aria-valuetext=${band ? `${text}, ${band.label}` : text}>
        <svg viewBox="0 0 100 92" aria-hidden="true">
          <path part="track" d=${arcPath(C, C, 42, 32, START, START + SWEEP)}></path>
          ${now > lo ? svg`<path part="arc" data-tone=${band ? (band.tone ?? 'neutral') : nothing} d=${arcPath(C, C, 42, 32, START, angle)}></path>` : nothing}
          ${segments}
          ${bands.slice(0, -1).map((b) => svg`<path part="tick" d="M${at(31, a(b.to))}L${at(49, a(b.to))}"></path>`)}
          <path part="needle" d="M${C} ${C}L${at(40, angle)}"></path>
          <circle class="hub" cx=${C} cy=${C} r="3"></circle>
        </svg>
        <span class="read" aria-hidden="true">
          ${this.showValue ? html`<span part="value">${text}</span>` : nothing}
          ${this.label ? html`<span part="label">${this.label}</span>` : nothing}
        </span>
      </div>
      ${
        bands.length
          ? html`<ul part="legend">
            ${bands.map((b) => html`<li data-tone=${b.tone ?? 'neutral'} aria-current=${b === band ? 'true' : nothing}>${this.localize.term('gaugeBand', b.label, fmt.format(b.to))}</li>`)}
          </ul>`
          : nothing
      }
    </div>`;
  }
}
