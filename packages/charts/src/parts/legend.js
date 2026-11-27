import { html, nothing, svg } from 'lit';
import { MARKERS, markerPath, shifted } from '../shapes.js';

/**
 * The legend swatch of item `i`: the series' line and marker (line), its fill under them (area),
 * its marker alone (scatter), else its fill (bars and slices).
 * @param {import('../types.js').ChartContext} ctx
 * @param {number} i
 */
function swatch(ctx, i) {
  const marker = svg`<path d=${markerPath(shifted(MARKERS, i), 9, 6, 4)} fill=${ctx.color(i)} stroke=${ctx.color(i)}/>`;
  const line = svg`<path d="M1 6h16" stroke=${ctx.color(i)} stroke-width="2"/>${marker}`;

  if (ctx.type === 'line') return line;

  if (ctx.type === 'scatter') return marker;

  if (ctx.type === 'area') return svg`<rect y="6" width="18" height="6" fill=${ctx.fill(i)} fill-opacity="0.24"/>${line}`;

  return svg`<rect width="18" height="12" rx="2" fill=${ctx.fill(i)}/>`;
}

/** @param {import('../types.js').ChartContext} ctx */
export function renderLegend(ctx) {
  const donut = ctx.type === 'donut';
  const items = donut ? ctx.rows.map((r, i) => ({ label: ctx.category(r), i })) : ctx.series.map((s, i) => ({ label: s.label, i }));

  if (!donut && items.length < 2) return nothing;

  return html`<ul part="legend" aria-hidden="true">
    ${items.map(({ label, i }) => html`<li><svg width="18" height="12" viewBox="0 0 18 12">${swatch(ctx, i)}</svg>${label}</li>`)}
  </ul>`;
}
