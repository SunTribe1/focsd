/**
 * The words of a chart: each point's accessible name and the generated summary.
 */
import { xValue } from './data.js';

/**
 * Share of the first series' total, as a percent string (donut slices).
 * @param {Pick<import('./types.js').ChartContext, 'rows' | 'valueAt'>} ctx
 * @param {string | undefined} locale
 * @param {number} value
 */
function percent({ rows, valueAt }, locale, value) {
  const total = rows.reduce((sum, _, i) => sum + (valueAt(0, i) ?? 0), 0);

  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(total ? value / total : 0);
}

/**
 * "Series, category: value" (donut: "category: value (share)").
 * @param {import('./types.js').ChartContext} ctx
 * @param {import('@focsd-dev/primitives').FocsdElement['localize']} localize
 * @param {number} seriesIndex
 * @param {number} rowIndex
 */
export function pointName(ctx, localize, seriesIndex, rowIndex) {
  const s = ctx.series[seriesIndex];
  const value = ctx.valueAt(seriesIndex, rowIndex);
  const category = ctx.category(ctx.rows[rowIndex]);
  const prefix = s && (ctx.series.length > 1 || ctx.type === 'donut') ? `${s.label}, ` : '';

  if (ctx.type === 'donut') {
    const v = /** @type {number} */ (value);

    return `${category}: ${ctx.number(v)} (${percent(ctx, localize.locale(), v)})`;
  }

  if (value == null) return `${prefix}${category}: ${localize.term('noData')}`;

  if (ctx.type === 'scatter') {
    const x = ctx.xNumber(/** @type {number} */ (xValue(ctx.rows[rowIndex], ctx.x)));

    return `${prefix}${localize.term('scatterPoint', x, ctx.number(value))}`;
  }

  const total = ctx.stack?.totals[rowIndex];
  const shown = total === undefined ? ctx.number(value) : localize.term('chartOfTotal', ctx.number(value), ctx.number(total));

  return `${prefix}${category}: ${shown}`;
}

/** The term naming each kind of chart. */
const KINDS = /** @type {Record<string, string>} */ ({
  bar: 'barChart',
  line: 'lineChart',
  donut: 'donutChart',
  area: 'areaChart',
  scatter: 'scatterChart',
  'stacked-bar': 'stackedBarChart',
  'stacked-area': 'stackedAreaChart',
});

/**
 * Scatter: "Scatter chart, 2 series, 48 points. x from 1 to 40, y from 3 to 97."
 * @param {import('./types.js').ChartContext} ctx
 * @param {import('@focsd-dev/primitives').FocsdElement['localize']} localize
 * @param {string} kind
 */
function summarizeScatter(ctx, localize, kind) {
  const xs = [];
  const ys = [];

  for (const si of ctx.series.keys())
    for (const [ri, row] of ctx.rows.entries()) {
      const y = ctx.valueAt(si, ri);

      if (y === null) continue;
      ys.push(y);
      xs.push(/** @type {number} */ (xValue(row, ctx.x)));
    }

  if (!ys.length) return localize.term('noData');
  /** @param {number[]} list @param {(v: number) => string} f */
  const range = (list, f) => localize.term('chartRange', f(Math.min(...list)), f(Math.max(...list)));

  const ranges = localize.term('scatterRanges', range(xs, ctx.xNumber), range(ys, ctx.number));

  return localize.term('scatterSummary', kind, ctx.series.length, ys.length, ranges);
}

/**
 * Stacked charts: the category with the highest total.
 * @param {import('./types.js').ChartContext} ctx
 * @param {import('@focsd-dev/primitives').FocsdElement['localize']} localize
 * @param {number[]} totals
 */
function highestTotal(ctx, localize, totals) {
  const best = totals.reduce((b, total, r) => (b < 0 || total > /** @type {number} */ (totals[b]) ? r : b), -1);

  return best < 0 ? '' : localize.term('chartHighestTotal', ctx.category(ctx.rows[best]), ctx.number(/** @type {number} */ (totals[best])));
}

/**
 * A one-sentence summary: chart type, size and the highest value (stacked: the highest total).
 * @param {import('./types.js').ChartContext} ctx
 * @param {import('@focsd-dev/primitives').FocsdElement['localize']} localize
 */
export function summarize(ctx, localize) {
  const { rows, series } = ctx;

  if (!rows.length || !series.length) return localize.term('noData');
  const kind = localize.term(KINDS[ctx.stack ? `stacked-${ctx.type}` : ctx.type] ?? 'barChart');

  if (ctx.type === 'scatter') return summarizeScatter(ctx, localize, kind);

  if (ctx.stack) return localize.term('chartSummary', kind, rows.length, series.length, highestTotal(ctx, localize, ctx.stack.totals));
  /** @type {{ s: import('./chart.js').ChartSeries, r: import('./chart.js').ChartRow, value: number } | null} */
  let best = null;

  for (const [si, s] of series.entries())
    for (const [ri, r] of rows.entries()) {
      const value = ctx.valueAt(si, ri);

      if (value !== null && (!best || value > best.value)) best = { s, r, value };
    }

  const highest = best
    ? localize.term('chartHighest', `${series.length > 1 ? `${best.s.label}, ` : ''}${ctx.category(best.r)}`, ctx.number(best.value))
    : '';

  return localize.term('chartSummary', kind, rows.length, series.length, highest);
}
