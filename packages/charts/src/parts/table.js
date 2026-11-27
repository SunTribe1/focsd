import { html, nothing } from 'lit';
import { xValue } from '../data.js';

/**
 * Scatter: one row per point, with its series, x and y.
 * @param {import('../types.js').ChartContext} ctx
 */
function scatterBody(ctx) {
  return ctx.series.map((s, si) =>
    ctx.rows.map((row, ri) => {
      const y = ctx.valueAt(si, ri);

      return y === null
        ? nothing
        : html`<tr>
            <th scope="row">${s.label}</th>
            <td>${ctx.xNumber(/** @type {number} */ (xValue(row, ctx.x)))}</td>
            <td>${ctx.number(y)}</td>
          </tr>`;
    }),
  );
}

/**
 * Categories: one row per category, a column per series (and the total when stacked).
 * @param {import('../types.js').ChartContext} ctx
 */
function categoryBody(ctx) {
  return ctx.rows.map(
    (r, ri) => html`<tr>
      <th scope="row">${ctx.category(r)}</th>
      ${ctx.series.map((s) => html`<td>${Number.isFinite(r?.[s.key]) ? ctx.number(/** @type {number} */ (r[s.key])) : ''}</td>`)}
      ${ctx.stack ? html`<td>${ctx.number(/** @type {number} */ (ctx.stack.totals[ri]))}</td>` : nothing}
    </tr>`,
  );
}

/** @param {import('../types.js').ChartContext} ctx */
export function renderTable(ctx) {
  const scatter = ctx.type === 'scatter';

  const heads = scatter
    ? [ctx.term('chartSeries'), ctx.x, ctx.yLabel]
    : [ctx.x, ...ctx.series.map((s) => s.label), ...(ctx.stack ? [ctx.term('chartTotal')] : [])];

  return html`<table part="table" id=${ctx.ids.table}>
    <caption class="focsd-visually-hidden">${ctx.label}</caption>
    <thead>
      <tr>
        ${heads.map((h) => html`<th scope="col">${h}</th>`)}
      </tr>
    </thead>
    <tbody>
      ${scatter ? scatterBody(ctx) : categoryBody(ctx)}
    </tbody>
  </table>`;
}
