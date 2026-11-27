import { nothing, svg } from 'lit';

/** Share of a category's band the bars fill. */
const BAR_SHARE = 0.72;

/** The smallest drawn height of a stacked segment, in pixels. */
const MIN_SEGMENT = 2;

/**
 * Grouped bars, one focusable bar per value; with `stacked`, one bar per category made of segments
 * (positives up from zero, negatives down). Bars follow the category order, mirrored or not.
 * @param {import('../types.js').ChartContext} ctx
 * @param {import('../types.js').CartesianPlot} plot
 * @returns {import('../types.js').MarkSet}
 */
export function barMarks(ctx, { rows, series, band, cx, y }) {
  const { stack } = ctx;
  const inner = band * BAR_SHARE;
  const slots = stack ? 1 : Math.max(1, series.length);
  const barW = inner / slots;
  /** @type {import('../types.js').PointMark | null} */
  let ring = null;

  const marks = series.map((s, si) =>
    rows.map((r, ri) => {
      const v = ctx.valueAt(si, ri);

      if (v === null) return nothing;
      const span = stack?.span(si, ri) ?? { base: 0, top: v };
      const slot = stack ? 0 : ctx.mirror ? slots - 1 - si : si;
      const x = cx(ri) - inner / 2 + barW * slot;
      const top = Math.min(y(span.top), y(span.base));
      const height = Math.max(1, Math.abs(y(span.top) - y(span.base)));
      // Stacked segments keep a 1px gap between them so patterns and edges stay apart.
      const gap = stack ? 1 : 0;

      const mark = {
        x: x + 1,
        y: top + gap / 2,
        width: Math.max(1, barW - 2),
        // A stacked segment is drawn at least 2px tall, so a tiny value stays visible and can be hovered.
        height: Math.max(stack ? MIN_SEGMENT : 1, height - gap),
        rx: 2,
        fill: ctx.fill(si),
      };

      const { active, tabindex, name } = ctx.pointAttrs(si, ri);

      if (active) ring = mark;

      return svg`<rect part="point${active ? ' point-active' : ''}" data-s=${si} data-r=${ri} role="img" aria-label=${name} tabindex=${tabindex}
        x=${mark.x} y=${mark.y} width=${mark.width} height=${mark.height} rx="2" fill=${mark.fill}
        @focus=${() => ctx.focus(si, ri)} @pointerenter=${() => ctx.setHover({ s: si, r: ri, x: x + barW / 2, y: top })} @pointerleave=${() => ctx.setHover(null)}></rect>`;
    }),
  );

  return { marks, ring };
}
