import { svg } from 'lit';
import { linePoints, seriesLine } from './line.js';

/** Opacity of the area fill under each line (spec R2), set as an attribute so strict CSP holds. */
const AREA_OPACITY = 0.24;

/**
 * Filled shapes under a series: one per run of drawn values, from the line down to its base
 * (zero, or the series below when stacked).
 * @param {Array<import('./line.js').LinePoint | null>} pts
 */
export function areaPath(pts) {
  /** @type {import('./line.js').LinePoint[][]} */
  const runs = [];
  let run = /** @type {import('./line.js').LinePoint[]} */ ([]);

  for (const p of pts) {
    if (p) run.push(p);
    else if (run.length) {
      runs.push(run);
      run = [];
    }
  }

  if (run.length) runs.push(run);
  /** @param {number} n */
  const f = (n) => n.toFixed(1);

  return runs
    .map(
      (r) =>
        `M${r.map((p) => `${f(p.x)} ${f(p.y)}`).join('L')}L${r
          .toReversed()
          .map((p) => `${f(p.x)} ${f(p.base)}`)
          .join('L')}Z`,
    )
    .join('');
}

/**
 * Area chart: each series' line and markers (as the line chart) over a pattern fill at low opacity.
 * All fills are drawn first so no fill covers another series' line or markers.
 * @param {import('../types.js').ChartContext} ctx
 * @param {import('../types.js').CartesianPlot} plot
 * @returns {import('../types.js').MarkSet}
 */
export function areaMarks(ctx, plot) {
  /** @type {import('../types.js').PointMark | null} */
  let ring = null;
  const points = plot.series.map((_, si) => linePoints(ctx, plot, si));

  const fills = points.map(
    (pts, si) => svg`<path class="area" d=${areaPath(pts)} fill=${ctx.fill(si)} fill-opacity=${AREA_OPACITY}></path>`,
  );

  const lines = points.map((pts, si) =>
    seriesLine(ctx, si, pts, (mark) => {
      ring = mark;
    }),
  );

  return { marks: [fills, lines], ring };
}
