import { nothing, svg } from 'lit';
import { MARKERS, markerPath, shifted } from '../shapes.js';

/** A drawn point of a line: its position, row and (stacked) base on the value axis. */
/** @typedef {{ x: number, y: number, r: number, base: number }} LinePoint */

/**
 * Where series `si` is drawn: one entry per row, null where the value is missing. Stacked series
 * sit on the ones before them.
 * @param {import('../types.js').ChartContext} ctx
 * @param {import('../types.js').CartesianPlot} plot
 * @param {number} si
 * @returns {Array<LinePoint | null>}
 */
export function linePoints(ctx, { rows, cx, y }, si) {
  return rows.map((_, ri) => {
    const v = ctx.valueAt(si, ri);

    if (v === null) return null;
    const span = ctx.stack?.span(si, ri) ?? { base: 0, top: v };

    return { x: cx(ri), y: y(span.top), r: ri, base: y(span.base) };
  });
}

/**
 * A path through the points, broken where a value is missing.
 * @param {Array<LinePoint | null>} pts
 */
const linePath = (pts) =>
  pts.reduce((acc, p, i) => (p ? `${acc}${acc && pts[i - 1] ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}` : acc), '');

/**
 * One focusable marker: the series' shape, so series differ by more than color.
 * @param {import('../types.js').ChartContext} ctx
 * @param {number} si
 * @param {{ x: number, y: number, r: number }} spot where row `r` of the series is drawn
 * @param {(mark: import('../types.js').PointMark) => void} onActive receives the active marker (for the ring)
 */
export function markerPoint(ctx, si, { x, y, r: ri }, onActive) {
  const { active, tabindex, name } = ctx.pointAttrs(si, ri);
  const marker = shifted(MARKERS, si);
  const fill = marker === 'cross' || marker === 'ring' ? 'var(--focsd-surface)' : ctx.color(si);
  const mark = { d: markerPath(marker, x, y), fill, stroke: ctx.color(si), strokeWidth: 2 };

  if (active) onActive(mark);

  return svg`<path class="marker" part="point${active ? ' point-active' : ''}" data-s=${si} data-r=${ri} role="img" aria-label=${name} tabindex=${tabindex}
    d=${mark.d} fill=${mark.fill} stroke=${mark.stroke} stroke-width="2"
    @focus=${() => ctx.focus(si, ri)} @pointerenter=${() => ctx.setHover({ s: si, r: ri, x, y })} @pointerleave=${() => ctx.setHover(null)}></path>`;
}

/**
 * The series line and one focusable marker per value.
 * @param {import('../types.js').ChartContext} ctx
 * @param {number} si
 * @param {Array<LinePoint | null>} pts
 * @param {(mark: import('../types.js').PointMark) => void} onActive receives the active marker (for the ring)
 */
export function seriesLine(ctx, si, pts, onActive) {
  return svg`<path class="line" d=${linePath(pts)} stroke=${ctx.color(si)}></path>${pts.map((p) => (p ? markerPoint(ctx, si, p, onActive) : nothing))}`;
}

/**
 * Line series with one focusable marker per value.
 * @param {import('../types.js').ChartContext} ctx
 * @param {import('../types.js').CartesianPlot} plot
 * @returns {import('../types.js').MarkSet}
 */
export function lineMarks(ctx, plot) {
  /** @type {import('../types.js').PointMark | null} */
  let ring = null;

  const marks = plot.series.map((_, si) =>
    seriesLine(ctx, si, linePoints(ctx, plot, si), (mark) => {
      ring = mark;
    }),
  );

  return { marks, ring };
}
