import { svg } from 'lit';
import { linear, niceTicks } from '../scale.js';
import { focusRing } from '../parts/focus-ring.js';
import { renderPatterns } from '../parts/patterns.js';

/** Space (px) around the plot area of bar and line charts, for the axis labels. */
const PLOT_PADDING = Object.freeze({ top: 12, right: 12, bottom: 28, left: 48 });

/** Gap (px) between the value axis labels and the plot. */
const VALUE_LABEL_GAP = 6;

/** Baseline offset (px) of the category labels below the plot. */
const CATEGORY_LABEL_OFFSET = 16;

/**
 * The tooltip anchor: the hovered point, else the active one (once points are drawn).
 * @param {import('../types.js').ChartContext} ctx
 * @param {(s: number, r: number) => { x: number, y: number } | null} at where a point is drawn
 * @returns {import('../types.js').ChartAnchor | null}
 */
export function anchorFor(ctx, at) {
  const point = ctx.hover ?? (ctx.active && ctx.hasRenderedPoints ? ctx.active : null);

  if (!point) return null;
  const text = ctx.pointName(point.s, point.r);

  if (point.x !== undefined) return { x: point.x, y: /** @type {number} */ (point.y), text };
  const spot = at(point.s, point.r);

  return spot && { ...spot, text };
}

/**
 * Space around the plot. The value labels sit on the left, or on the right of a mirrored plot,
 * and that side grows to fit the widest one measured after the last render.
 * @param {import('../types.js').ChartContext} ctx
 * @returns {import('../types.js').Padding}
 */
export function plotPadding(ctx) {
  const labels = Math.max(PLOT_PADDING.left, ctx.labelWidth + VALUE_LABEL_GAP + 2);

  return ctx.mirror ? { ...PLOT_PADDING, left: PLOT_PADDING.right, right: labels } : { ...PLOT_PADDING, left: labels };
}

/**
 * Grid lines and value labels for `ticks` (measured by the element: keep the `axis grid` class).
 * @param {import('../types.js').ChartContext} ctx
 * @param {number[]} ticks
 * @param {(v: number) => number} y
 * @param {import('../types.js').Padding} pad
 */
export function valueAxis(ctx, ticks, y, pad) {
  const right = ctx.width - pad.right;
  const labelX = ctx.mirror ? right + VALUE_LABEL_GAP : pad.left - VALUE_LABEL_GAP;
  const anchor = ctx.mirror ? 'start' : 'end';

  return svg`<g class="axis grid">${ticks.map(
    (t) =>
      svg`<line x1=${pad.left} x2=${right} y1=${y(t)} y2=${y(t)}></line><text x=${labelX} y=${y(t)} text-anchor=${anchor} dominant-baseline="middle">${ctx.number(t)}</text>`,
  )}</g>`;
}

/** Baseline offset (px) of the labels under the plot, for other frames (scatter). */
export const BELOW_PLOT = CATEGORY_LABEL_OFFSET;

/**
 * The value domain: zero and every drawn value, or the stacked ends of a stacked chart.
 * @param {import('../types.js').ChartContext} ctx
 * @returns {import('../types.js').Domain}
 */
function valueDomain(ctx) {
  if (ctx.stack) return niceTicks(ctx.stack.min, ctx.stack.max);
  const values = ctx.series.flatMap((_series, si) => ctx.rows.flatMap((_row, ri) => ctx.valueAt(si, ri) ?? []));

  return niceTicks(Math.min(...values, 0), Math.max(...values, 0));
}

/**
 * The shared frame of the category charts (bar, line, area): scales, grid, axes, patterns and focus
 * ring around the marks a mark module draws. Categories run left to right, or right to left with
 * `mirror`; the value axis always includes zero.
 * @param {import('../types.js').ChartContext} ctx
 * @param {(ctx: import('../types.js').ChartContext, plot: import('../types.js').CartesianPlot) => import('../types.js').MarkSet} drawMarks
 * @returns {import('../types.js').ChartDrawing}
 */
export function drawCartesian(ctx, drawMarks) {
  const { rows, series, width, height } = ctx;
  const pad = plotPadding(ctx);
  const { min, max, ticks } = valueDomain(ctx);
  const y = linear(min, max, height - pad.bottom, pad.top);
  const plotW = Math.max(1, width - pad.left - pad.right);
  const band = plotW / Math.max(1, rows.length);
  /** @param {number} i */
  const cx = (i) => (ctx.mirror ? width - pad.right - band * i - band / 2 : pad.left + band * i + band / 2);

  const axis = svg`${valueAxis(ctx, ticks, y, pad)}
    <line class="baseline" x1=${pad.left} x2=${width - pad.right} y1=${y(0)} y2=${y(0)}></line>
    <g class="axis">${rows.map((r, i) => svg`<text x=${cx(i)} y=${height - pad.bottom + CATEGORY_LABEL_OFFSET} text-anchor="middle">${ctx.category(r)}</text>`)}</g>`;

  const { marks, ring } = drawMarks(ctx, { rows, series, band, cx, y, pad });
  /** @param {number} s @param {number} r */

  const at = (s, r) => {
    const v = ctx.valueAt(s, r);

    return v === null ? null : { x: cx(r), y: y(ctx.stack?.span(s, r)?.top ?? v) };
  };

  return { body: svg`${renderPatterns(ctx)}${axis}${marks}${focusRing(ring)}`, width, height, anchor: anchorFor(ctx, at) };
}
