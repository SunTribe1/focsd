import { nothing, svg } from 'lit';
import { PATTERNS, shifted } from '../shapes.js';

/**
 * One fill pattern per series (per slice for donuts), so marks differ by more than color.
 * @param {import('../types.js').ChartContext} ctx
 * @param {number} [count]
 */
export function renderPatterns(ctx, count = ctx.series.length) {
  return svg`<defs>${Array.from({ length: count }, (_, i) => {
    const pattern = shifted(PATTERNS, i);

    if (pattern === 'solid') return nothing;
    const id = `${ctx.ids.caption}-p${i}`;

    const marks = {
      hatch: svg`<path d="M-1 1l2-2M0 8l8-8M7 9l2-2" stroke="var(--focsd-surface)" stroke-width="1.5"/>`,
      dots: svg`<circle cx="4" cy="4" r="1.4" fill="var(--focsd-surface)"/>`,
      lines: svg`<path d="M0 4h8" stroke="var(--focsd-surface)" stroke-width="1.5"/>`,
      'cross-hatch': svg`<path d="M0 0l8 8M8 0L0 8" stroke="var(--focsd-surface)" stroke-width="1.2"/>`,
      grid: svg`<path d="M4 0v8M0 4h8" stroke="var(--focsd-surface)" stroke-width="1.2"/>`,
    }[pattern];

    return svg`<pattern id=${id} width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill=${ctx.color(i)}/>${marks}</pattern>`;
  })}</defs>`;
}
