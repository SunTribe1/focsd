import { nothing, svg } from 'lit';
import { arcPath } from '../scale.js';
import { focusRing } from '../parts/focus-ring.js';
import { renderPatterns } from '../parts/patterns.js';

/**
 * Donut: one slice per row of the first series.
 * @param {import('../types.js').ChartContext} ctx
 * @returns {import('../types.js').ChartDrawing}
 */
export function drawDonut(ctx) {
  const { rows } = ctx;
  const size = Math.min(ctx.width, ctx.height);
  const c = size / 2;
  const outer = c - 4;
  const inner = outer * 0.6;
  const total = rows.reduce((sum, _, ri) => sum + (ctx.valueAt(0, ri) ?? 0), 0);
  let angle = 0;
  /** Where each slice's tooltip points: the middle of its outer edge. */
  /** @type {Map<number, { x: number, y: number }>} */
  const tips = new Map();
  /** @type {import('../types.js').PointMark | null} */
  let ring = null;

  const slices = rows.map((_, ri) => {
    const v = ctx.valueAt(0, ri);

    if (v === null) return nothing;
    const start = angle;
    angle += (v / total) * Math.PI * 2;
    const { active, tabindex, name } = ctx.pointAttrs(0, ri);
    const d = arcPath(c, c, outer, inner, start, angle);

    if (active) ring = { d, fill: ctx.fill(ri) };
    const mid = (start + angle) / 2;
    tips.set(ri, { x: c + outer * Math.sin(mid), y: c - outer * Math.cos(mid) });

    return svg`<path part="point${active ? ' point-active' : ''}" data-s="0" data-r=${ri} role="img" aria-label=${name} tabindex=${tabindex}
      d=${d} fill=${ctx.fill(ri)}
      @focus=${() => ctx.focus(0, ri)}
      @pointerenter=${() => ctx.setHover({ s: 0, r: ri, ...tips.get(ri) })}
      @pointerleave=${() => ctx.setHover(null)}></path>`;
  });

  // Each slice gets its own pattern, like series in bar charts.
  const defs = renderPatterns(ctx, rows.length);
  /** @type {import('../types.js').ChartAnchor | null} */
  let anchor = null;
  const point = ctx.hover ?? ctx.active;
  const tip = point && tips.get(point.r);

  if (tip) anchor = { ...tip, text: ctx.pointName(0, point.r) };

  return { body: svg`${defs}${slices}${focusRing(ring)}`, width: size, height: size, anchor, centered: true };
}
