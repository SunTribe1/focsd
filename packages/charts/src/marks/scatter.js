import { nothing, svg } from 'lit';
import { xValue } from '../data.js';
import { focusRing } from '../parts/focus-ring.js';
import { linear, niceTicks } from '../scale.js';
import { BELOW_PLOT, anchorFor, plotPadding, valueAxis } from './cartesian.js';
import { markerPoint } from './line.js';

/**
 * Scatter: numeric x and y, both on "nice" axes around the data (zero is not forced in). Each
 * value is a focusable marker; series differ by marker shape as well as color.
 * @param {import('../types.js').ChartContext} ctx
 * @returns {import('../types.js').ChartDrawing}
 */
export function drawScatter(ctx) {
  const { rows, series, width, height } = ctx;
  const pad = plotPadding(ctx);
  const xs = [];
  const ys = [];

  for (const si of series.keys())
    for (const [ri, row] of rows.entries()) {
      const v = ctx.valueAt(si, ri);

      if (v === null) continue;
      ys.push(v);
      xs.push(/** @type {number} */ (xValue(row, ctx.x)));
    }

  const xd = niceTicks(Math.min(...xs), Math.max(...xs), 5, false);
  const yd = niceTicks(Math.min(...ys), Math.max(...ys), 5, false);
  const left = pad.left;
  const right = width - pad.right;
  const bottom = height - pad.bottom;
  const px = ctx.mirror ? linear(xd.min, xd.max, right, left) : linear(xd.min, xd.max, left, right);
  const py = linear(yd.min, yd.max, bottom, pad.top);
  /** @param {number} s @param {number} r */

  const at = (s, r) => {
    const v = ctx.valueAt(s, r);

    return v === null ? null : { x: px(/** @type {number} */ (xValue(rows[r], ctx.x))), y: py(v) };
  };

  const axes = svg`${valueAxis(ctx, yd.ticks, py, pad)}
    <line class="baseline" x1=${left} x2=${right} y1=${bottom} y2=${bottom}></line>
    <g class="axis">${xd.ticks.map((t) => svg`<text x=${px(t)} y=${bottom + BELOW_PLOT} text-anchor="middle">${ctx.xNumber(t)}</text>`)}</g>`;

  /** @type {import('../types.js').PointMark | null} */
  let ring = null;

  const marks = series.map((_, si) =>
    rows.map((_row, ri) => {
      const spot = at(si, ri);

      if (!spot) return nothing;

      return markerPoint(ctx, si, { ...spot, r: ri }, (mark) => {
        ring = mark;
      });
    }),
  );

  return { body: svg`${axes}${marks}${focusRing(ring)}`, width, height, anchor: anchorFor(ctx, at) };
}
