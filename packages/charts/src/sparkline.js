import { css, svg } from 'lit';
import { FocsdElement } from '@focsd-dev/primitives';
import { warnOnce } from '@focsd-dev/primitives/internal';
import { numberFormat } from './format.js';
import { linear } from './scale.js';

const PAD = 3;
const W = 100;
const H = 24;
const TYPES = new Set(['line', 'area', 'bar']);

/**
 * The smallest and largest of `list` (no spread: a long series must not overflow the call stack).
 * @param {number[]} list
 * @returns {[number, number]}
 */
const extent = (list) =>
  list.reduce(
    (r, n) => /** @type {[number, number]} */ ([Math.min(r[0], n), Math.max(r[1], n)]),
    /** @type {[number, number]} */ ([Infinity, -Infinity]),
  );

/** @param {number} n */
const f = (n) => n.toFixed(1);

/** @param {unknown[] | null | undefined} list The finite numbers of `list`. */
const finite = (list) => (Array.isArray(list) ? /** @type {number[]} */ (list.filter(Number.isFinite)) : []);

/**
 * "6 values, from 4 to 19, last 17, up 325% from the first": the sparkline's text alternative.
 * @param {unknown[] | null | undefined} list
 * @param {(value: number) => string} fmt Formats one value.
 * @param {Pick<import('@focsd-dev/primitives').FocsdElement['localize'], 'locale' | 'term'>} words The element's localizer.
 */
export function sparkSummary(list, fmt, words) {
  const v = finite(list);
  const [first = 0] = v;
  const last = v.at(-1) ?? 0;

  if (!v.length) return words.term('noData');

  if (v.length === 1) return words.term('sparkOne', fmt(last));

  const share = numberFormat(words.locale(), { style: 'percent', maximumFractionDigits: 0 }, 'focsd-sparkline').format(
    Math.abs((last - first) / first),
  );

  const amount = first ? share : '';

  const change = last === first ? words.term('sparkSame') : words.term(last > first ? 'sparkUp' : 'sparkDown', amount);

  const [lo, hi] = extent(v);

  return words.term('sparkSummary', v.length, words.term('chartRange', fmt(lo), fmt(hi)), fmt(last), change);
}

/**
 * Sparkline: a word-sized graphic of a series of numbers. It is an image named by its label and a
 * generated sentence (count, range, last value and change); it has no focusable points. Put the
 * chart's detail in a `focsd-chart` when it matters.
 *
 * @csspart svg - The drawing.
 * @csspart line - The line (also the outline of an area).
 * @csspart area - The filled area under the line.
 * @csspart bar - Each bar.
 * @csspart last - The dot on the last value (`show-last`).
 * @cssprop --focsd-sparkline-height - The height (default `1lh`, one line of text).
 * @cssprop --focsd-sparkline-width - The width (default `6em`).
 * @cssprop --focsd-chart-1 - The color of the marks (default `--focsd-route`).
 */
export class FocsdSparkline extends FocsdElement {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdElement.styles,
    css`
      :host {
        display: inline-block;
        inline-size: var(--focsd-sparkline-width, 6em);
        block-size: var(--focsd-sparkline-height, 1lh);
        vertical-align: text-bottom;
        --_chart-1: var(--focsd-chart-1, var(--focsd-route));
      }
      svg {
        display: block;
        inline-size: 100%;
        block-size: 100%;
        overflow: visible;
      }
      [part=line],
      [part=last] {
        fill: none;
        stroke: var(--_chart-1);
        stroke-width: 1.5;
        stroke-linejoin: round;
        stroke-linecap: round;
        vector-effect: non-scaling-stroke;
      }
      [part=last] {
        stroke-width: 5;
      }
      [part=area],
      [part=bar] {
        fill: var(--_chart-1);
      }
      @media (forced-colors: active) {
        [part=line],
        [part=last] {
          stroke: CanvasText;
        }
        [part=area],
        [part=bar] {
          fill: CanvasText;
        }
      }
    `,
  ];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    values: { attribute: false },
    label: {},
    type: { reflect: true },
    format: { attribute: false },
    showLast: { type: Boolean, attribute: 'show-last' },
    min: { type: Number },
    max: { type: Number },
  };

  constructor() {
    super();
    /** @type {number[]} The values, oldest first. */
    this.values = [];
    /** The accessible name; the generated sentence follows it. */
    this.label = '';
    /** @type {'line' | 'area' | 'bar'} How the values are drawn. */
    this.type = 'line';
    /** @type {Intl.NumberFormatOptions | undefined} Number format options for values, as for `Intl.NumberFormat`. */
    this.format = undefined;
    /** Draws a dot on the last value. */
    this.showLast = false;
    /** @type {number | undefined} The bottom of the scale (default: the smallest value, or 0 for bars and areas). */
    this.min = undefined;
    /** @type {number | undefined} The top of the scale (default: the largest value). */
    this.max = undefined;
  }

  /** The text alternative: the label, then the generated sentence. */
  get summary() {
    const fmt = numberFormat(this.localize.locale(), this.format, 'focsd-sparkline');
    const text = sparkSummary(this.values, (v) => fmt.format(v), this.localize);

    return this.label ? `${this.label}: ${text}` : text;
  }

  /** Developer warnings: no label, and values dropped because they are not finite numbers. @param {number} kept */
  #warn(kept) {
    if (!this.label) warnOnce('sparkline-label', 'focsd-sparkline needs a label: set the label attribute.');

    if (Array.isArray(this.values) && kept < this.values.length)
      warnOnce('sparkline-values', 'focsd-sparkline skipped values that are not finite numbers; the line joins across them.');
  }

  /** @override */
  render() {
    const v = finite(this.values);
    const type = TYPES.has(this.type) ? this.type : 'line';
    const solid = type !== 'line';
    const [min, max] = extent(solid ? [...v, 0] : v);
    const lo = this.min ?? min;
    const hi = this.max ?? max;

    this.#warn(v.length);

    const flat = lo === hi ? 1 : 0;
    const y = linear(hi + flat, lo - flat, PAD, H - PAD);
    const slot = (W - 2 * PAD) / v.length;

    const x = (/** @type {number} */ i) =>
      type === 'bar' ? PAD + (i + 0.5) * slot : v.length < 2 ? W / 2 : PAD + (i * (W - 2 * PAD)) / (v.length - 1);

    const points = v.map((n, i) => `${f(x(i))} ${f(y(n))}`);
    const base = y(Math.max(lo, 0));
    const line = `M${points.join('L')}`;
    const end = v.length - 1;
    const fb = f(base);

    return svg`<svg part="svg" role="img" aria-label=${this.summary} viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${
      !v.length
        ? ''
        : type === 'bar'
          ? v.map(
              (n, i) =>
                svg`<rect part="bar" x=${f(x(i) - slot * 0.35)} y=${f(Math.min(y(n), base))} width=${f(slot * 0.7)} height=${f(Math.max(1, Math.abs(y(n) - base)))}></rect>`,
            )
          : svg`${type === 'area' ? svg`<path part="area" fill-opacity="0.24" d="${line}L${f(x(end))} ${fb}L${f(x(0))} ${fb}Z"></path>` : ''}<path part="line" d=${line}></path>`
    }${(this.showLast || v.length === 1) && v.length && type !== 'bar' ? svg`<path part="last" d="M${f(x(end))} ${f(y(v[end] ?? 0))}h0"></path>` : ''}</svg>`;
  }
}
