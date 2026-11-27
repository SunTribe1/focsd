import { html, nothing, svg } from 'lit';
import { FocsdElement } from '@focsd/primitives';
import { cssomStyle, uid } from '@focsd/primitives/internal';
import { firstDrawnPoint, pointValue, resolveRows, resolveSeries } from './data.js';
import { stackValues } from './stack.js';
import { pointName, summarize } from './describe.js';
import { numberFormat } from './format.js';
import { nextPoint } from './keyboard.js';
import { DRAWINGS, draw } from './marks/index.js';
import { renderLegend } from './parts/legend.js';
import { renderTable } from './parts/table.js';
import { PATTERNS, seriesColor, shifted } from './shapes.js';
import { chartStyles } from './styles.js';

/** @typedef {Record<string, unknown>} ChartRow */

/** @typedef {string} ChartKey The name of a key in the rows. */
/** @typedef {{ key: string, label: string }} ChartSeries */

/**
 * `detail` of `focsd-point-focus`: the focused point's series key, category and value (null when missing).
 * @typedef {{ series: string, category: string, value: number | null }} PointFocusDetail
 */

/** Size (px) before the chart is measured; `height` can be set, the width follows the container. */
const DEFAULT_HEIGHT = 240;
const DEFAULT_WIDTH = 600;

/** Types whose series can be `stacked`. */
const STACKABLE = new Set(['bar', 'area']);

/**
 * Chart: bar, line, area, scatter or donut; bars and areas can be `stacked`. The drawing is
 * decorative; the same data is available as a caption, a generated summary, keyboard-focusable data
 * points named "Series, category: value" (scatter: "Series, x: 3, y: 7"), and a data table that can
 * be shown. Series use markers and patterns, not color alone. The plot runs left to right in every
 * writing direction; `mirror` runs it right to left with the value axis on the right.
 *
 * @fires {CustomEvent<PointFocusDetail>} focsd-point-focus - A data point received focus. `detail` has `series`, `category`, `value`.
 * @csspart figure - The figure.
 * @csspart caption - The caption (the chart's label).
 * @csspart chart - The drawing area.
 * @csspart point - Each data point (bar, marker or slice); `point-active` when focused.
 * @csspart tooltip - The value shown for the focused or hovered point.
 * @csspart legend - The legend list.
 * @csspart table-toggle - The "Show data table" button.
 * @csspart table - The data table.
 * @cssprop --focsd-chart-1 - Color of the first series (default `--focsd-route`).
 * @cssprop --focsd-chart-2 - Color of the second series (default `--focsd-ink`).
 * @cssprop --focsd-chart-3 - Color of the third series (default `--focsd-caution`).
 * @cssprop --focsd-chart-4 - Color of the fourth series (default `--focsd-critical`).
 * @cssprop --focsd-chart-5 - Color of the fifth series (default `--focsd-positive`).
 * @cssprop --focsd-chart-6 - Color of the sixth series (default `--focsd-ink-muted`); series 7 on reuse the six colors.
 */
export class FocsdChart extends FocsdElement {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdElement.styles, chartStyles];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    label: {},
    description: {},
    type: { reflect: true },
    data: { attribute: false },
    x: {},
    series: { attribute: false },
    format: { attribute: false },
    xFormat: { attribute: false },
    y: {},
    stacked: { type: Boolean, reflect: true },
    mirror: { type: Boolean, reflect: true },
    height: { type: Number },
    showTable: { type: Boolean, attribute: 'show-table', reflect: true },
    _active: { state: true },
    _hover: { state: true },
    _width: { state: true },
  };

  /** A web font that finishes loading changes label widths: measure again. */
  #onFontsLoaded = () => this.requestUpdate();

  /** Widest value-axis label, measured after render (0 until then, or without layout). */
  #labelWidth = 0;

  #ids = { caption: uid('focsd-chart-caption'), summary: uid('focsd-chart-summary'), table: uid('focsd-chart-table') };

  #resize =
    typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(([entry]) => {
          if (!entry) return;

          const host = /** @type {FocsdChart} */ (this);
          const width = Math.round(entry.contentRect.width);

          if (width && width !== host._width) host._width = width;
        });

  constructor() {
    super();
    /** The accessible name of the chart. */
    this.label = '';
    /** A description of the chart, read after its label. */
    this.description = '';
    /** @type {'bar' | 'line' | 'area' | 'scatter' | 'donut'} The kind of chart. */
    this.type = 'bar';
    /** @type {ChartRow[]} The rows: one object per category, with the `x` key and a number per series. */
    this.data = [];
    /** @type {ChartKey} The key of the rows that holds each category's label (scatter: each point's numeric x). */
    this.x = 'label';
    /**
     * @type {Array<string | ChartSeries>}
     * The series: keys of the rows, or objects with a `key` and a `label`. Empty uses every number key.
     */
    this.series = [];
    /** @type {Intl.NumberFormatOptions | undefined} Number format options for values, as for `Intl.NumberFormat`. */
    this.format = undefined;
    /** @type {Intl.NumberFormatOptions | undefined} Number format options for scatter x values. */
    this.xFormat = undefined;
    /** @type {ChartKey} Scatter: the key of the y values, when `series` is empty (else every number key but `x`). */
    this.y = '';
    /** Stacks the series of a bar or area chart; the summary and table add totals. */
    this.stacked = false;
    /** Runs the plot right to left, with the value axis on the right; Left/Right follow it. */
    this.mirror = false;
    /** The chart's height in pixels. */
    this.height = DEFAULT_HEIGHT;
    /** Shows the data as a table under the chart. */
    this.showTable = false;
    /** @type {import('./types.js').ChartPoint | null} */
    this._active = null;
    /** @type {import('./types.js').ChartPoint | null} */
    this._hover = null;
    this._width = DEFAULT_WIDTH;
  }

  /** @override */
  updated() {
    // Value labels are end-anchored left of the plot: make room for the widest one (its ink box,
    // which can overhang the advance width that getComputedTextLength and getBBox report).
    const texts = /** @type {SVGTextElement[]} */ ([...this.renderRoot.querySelectorAll('.axis.grid text')]);
    const widest = Math.ceil(Math.max(0, ...texts.map((t) => t.getBoundingClientRect().width)));

    if (widest === this.#labelWidth) return;
    this.#labelWidth = widest;
    // Layout-driven: the widths exist only once this render is laid out, so the re-render that makes
    // room for them is scheduled after this update (still before paint), not requested inside it.
    queueMicrotask(() => this.requestUpdate());
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
    globalThis.document?.fonts?.addEventListener('loadingdone', this.#onFontsLoaded);
    this.updateComplete.then(() => {
      const area = this.renderRoot.querySelector('[part~="chart"]');

      if (area) this.#resize?.observe(area);
    });
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#resize?.disconnect();
    globalThis.document?.fonts?.removeEventListener('loadingdone', this.#onFontsLoaded);
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  willUpdate(changed) {
    super.willUpdate?.(changed);

    // Data changed under the active point: fall back to the first point so the chart stays reachable.
    if (this._active && !this.#context().hasPoint(this._active.s, this._active.r)) this._active = null;
  }

  /** @type {Map<string, Intl.NumberFormat>} */
  #formatters = new Map();

  /**
   * Formats with `options`; invalid options fall back to plain numbers (and warn once).
   * @param {number} v
   * @param {Intl.NumberFormatOptions | undefined} options
   */
  #number(v, options) {
    const locale = this.localize.locale();
    const key = `${locale}|${JSON.stringify(options ?? {})}`;
    let formatter = this.#formatters.get(key);

    if (!formatter) {
      formatter = numberFormat(locale, options);

      if (this.#formatters.size > 8) this.#formatters.clear();
      this.#formatters.set(key, formatter);
    }

    return formatter.format(v);
  }

  /**
   * What the drawing, legend, table and keyboard modules need, as plain data and functions.
   * @returns {import('./types.js').ChartContext}
   */
  #context() {
    const { type, x } = this;
    const rows = resolveRows(this.data);
    const listed = !this.series?.length && type === 'scatter' && this.y ? [this.y] : this.series;
    const series = resolveSeries(listed, rows, x);
    const valueAt = (/** @type {number} */ s, /** @type {number} */ r) => pointValue({ type, series, rows, x }, s, r);
    /** @type {{ s: number, r: number } | null | undefined} */
    let first;
    // Once per context: finding it sorts a whole scatter series, and every point asks.
    const firstPoint = () => (first === undefined ? (first = firstDrawnPoint(type, series, rows, x)) : first);
    const stacks = this.stacked && (STACKABLE.has(type) || !DRAWINGS[type]);
    const active = this._active;
    const ids = this.#ids;

    /** @type {import('./types.js').ChartContext} */
    const ctx = {
      type,
      rows,
      series,
      x,
      mirror: this.mirror,
      stack: stacks ? stackValues(valueAt, series.length, rows.length) : null,
      label: this.label,
      ids,
      width: this._width,
      height: this.height,
      labelWidth: this.#labelWidth,
      active,
      hover: this._hover,
      valueAt,
      hasPoint: (s, r) => valueAt(s, r) !== null,
      firstPoint,
      category: (row) => String(row?.[x] ?? ''),
      number: (v) => this.#number(v, this.format),
      xNumber: (v) => this.#number(v, this.xFormat),
      yLabel: this.y || (series.length === 1 ? /** @type {ChartSeries} */ (series[0]).label : 'y'),
      term: (key, ...args) => this.localize.term(key, ...args),
      pointName: (s, r) => pointName(ctx, this.localize, s, r),
      pointAttrs: (s, r) => {
        const start = active ? null : firstPoint();
        const isActive = active?.s === s && active?.r === r;
        const tabStop = active ? isActive : start?.s === s && start?.r === r;

        return { active: isActive, tabindex: tabStop ? '0' : '-1', name: ctx.pointName(s, r) };
      },
      color: seriesColor,
      fill: (i) => (shifted(PATTERNS, i) === 'solid' ? seriesColor(i) : `url(#${ids.caption}-p${i})`),
      focus: (s, r) => {
        this._active = { s, r };
      },
      setHover: (point) => {
        this._hover = point;
      },
      hasRenderedPoints: Boolean(this.renderRoot?.querySelector('[part~="point"]')),
    };

    return ctx;
  }

  /** A one-sentence summary: chart type, size and the highest value. */
  get summary() {
    return this.description || summarize(this.#context(), this.localize);
  }

  /**
   * @param {number} seriesIndex
   * @param {number} rowIndex
   */
  #focusPoint(seriesIndex, rowIndex) {
    this._active = { s: seriesIndex, r: rowIndex };
    // Only the arrow keys move focus here. Firefox does not mark a script focus as :focus-visible when the
    // previous focus came from a click, so ask for the ring explicitly (other engines ignore the option).
    this.updateComplete.then(() =>
      /** @type {HTMLElement} */ (this.renderRoot.querySelector(`[data-s="${seriesIndex}"][data-r="${rowIndex}"]`))?.focus({
        focusVisible: true,
      }),
    );
    const ctx = this.#context();
    const s = ctx.series[seriesIndex];

    if (!s) return;
    /** @type {PointFocusDetail} */
    const detail = { series: s.key, category: ctx.category(ctx.rows[rowIndex]), value: ctx.valueAt(seriesIndex, rowIndex) };

    this.dispatchEvent(new CustomEvent('focsd-point-focus', { bubbles: true, detail }));
  }

  /** @param {KeyboardEvent} event */
  #onKeyDown = (event) => {
    // Browser and system shortcuts (Alt+Left is Back, Ctrl+Home scrolls) are not ours.
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const ctx = this.#context();

    if (!ctx.rows.length || !ctx.series.length) return;
    const start = this._active ?? ctx.firstPoint();

    if (!start) return;
    const next = nextPoint(ctx, start, event.key);

    if (!next) return;
    event.preventDefault();
    this.#focusPoint(next[0], next[1]);
  };

  /**
   * Horizontal tooltip position. Bar and line charts fill the width (viewBox = measured width); the
   * donut is a square drawn at its own size and centered, so offset from the middle in pixels.
   * @param {import('./types.js').ChartDrawing} drawn
   */
  #tooltipLeft(drawn) {
    const anchor = /** @type {import('./types.js').ChartAnchor} */ (drawn.anchor);

    if (drawn.centered) return `calc(50% + ${(anchor.x - drawn.width / 2).toFixed(1)}px)`;

    return `${(anchor.x / drawn.width) * 100}%`;
  }

  /** @override */
  render() {
    const ctx = this.#context();
    const drawn = draw(ctx);
    /** @param {string} k */
    const t = (k) => this.localize.term(k);

    return html`<figure part="figure" aria-labelledby=${this.#ids.caption}>
      <figcaption part="caption" id=${this.#ids.caption}>${this.label}</figcaption>
      <p class="focsd-visually-hidden" id=${this.#ids.summary}>${this.summary}</p>
      <div
        part="chart"
        role="group"
        aria-roledescription=${t('chart')}
        aria-labelledby=${this.#ids.caption}
        aria-describedby=${this.#ids.summary}
        @keydown=${this.#onKeyDown}
        @focusout=${(/** @type {FocusEvent} */ e) => {
          const area = /** @type {HTMLElement} */ (this.renderRoot.querySelector('[part~="chart"]'));

          if (!area.contains(/** @type {Node | null} */ (e.relatedTarget))) this._hover = null;
        }}
      >
        <svg viewBox="0 0 ${drawn.width} ${drawn.height}" height=${drawn.height} role="presentation">
          ${drawn.body}
          ${ctx.firstPoint() ? nothing : svg`<text class="empty" x="50%" y="50%" text-anchor="middle" dominant-baseline="middle">${t('noData')}</text>`}
        </svg>
        ${drawn.anchor ? html`<div part="tooltip" aria-hidden="true" style=${cssomStyle({ left: this.#tooltipLeft(drawn), top: `${drawn.anchor.y}px` })}>${drawn.anchor.text}</div>` : nothing}
      </div>
      ${renderLegend(ctx)}
      <button part="table-toggle" type="button" aria-expanded=${String(this.showTable)} aria-controls=${this.#ids.table} @click=${() => (this.showTable = !this.showTable)}>
        ${t(this.showTable ? 'hideDataTable' : 'showDataTable')}
      </button>
      <div ?hidden=${!this.showTable}>${renderTable(ctx)}</div>
    </figure>`;
  }
}
