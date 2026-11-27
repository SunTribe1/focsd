/**
 * Pure data access for the chart: which series and rows exist, and which points are drawn.
 * No DOM, no element state.
 */

/**
 * Series to draw: `series`, else every numeric key of the first row except `x`.
 * @param {Array<string | import('./chart.js').ChartSeries> | undefined} series
 * @param {import('./chart.js').ChartRow[]} rows
 * @param {string} x
 * @returns {import('./chart.js').ChartSeries[]}
 */
export function resolveSeries(series, rows, x) {
  if (series?.length) return series.map((s) => (typeof s === 'string' ? { key: s, label: s } : s));
  const first = rows[0] ?? {};

  return Object.keys(first)
    .filter((k) => k !== x && typeof first[k] === 'number')
    .map((k) => ({ key: k, label: k }));
}

/** @param {unknown} data @returns {import('./chart.js').ChartRow[]} */
export const resolveRows = (data) => (Array.isArray(data) ? data : []);

/** @typedef {{ type: string, series: import('./chart.js').ChartSeries[], rows: import('./chart.js').ChartRow[], x?: string }} ChartData */

/**
 * A row's numeric x (scatter charts), else null.
 * @param {import('./chart.js').ChartRow | undefined} row
 * @param {string | undefined} x
 * @returns {number | null}
 */
export function xValue(row, x) {
  const raw = x === undefined ? undefined : row?.[x];

  return Number.isFinite(raw) ? /** @type {number} */ (raw) : null;
}

/**
 * A drawable value: finite numbers only (donut slices must also be positive, scatter points need a
 * finite x too), else null.
 * @param {ChartData} chart
 * @param {number} seriesIndex
 * @param {number} rowIndex
 * @returns {number | null}
 */
export function pointValue({ type, series, rows, x }, seriesIndex, rowIndex) {
  const key = /** @type {string} */ (series[seriesIndex]?.key);
  const raw = rows[rowIndex]?.[key];

  if (!Number.isFinite(raw)) return null;

  if (type === 'scatter' && xValue(rows[rowIndex], x) === null) return null;
  const v = /** @type {number} */ (raw);

  if (type === 'donut') return seriesIndex === 0 && v > 0 ? v : null;

  return v;
}

/**
 * The rows of series `s` that are drawn, in x order (ties keep row order). Scatter keyboard order.
 * @param {ChartData} chart
 * @param {number} s
 * @returns {number[]}
 */
export function rowsByX(chart, s) {
  const drawn = chart.rows.flatMap((row, r) =>
    pointValue(chart, s, r) === null ? [] : [{ r, x: /** @type {number} */ (xValue(row, chart.x)) }],
  );

  return drawn.toSorted((a, b) => a.x - b.x || a.r - b.r).map((p) => p.r);
}

/**
 * The first point that is drawn, in series then category order (scatter: then x order).
 * @param {string} type
 * @param {import('./chart.js').ChartSeries[]} series
 * @param {import('./chart.js').ChartRow[]} rows
 * @param {string} [x] the x key (scatter)
 * @returns {{ s: number, r: number } | null}
 */
export function firstDrawnPoint(type, series, rows, x) {
  const count = type === 'donut' ? Math.min(1, series.length) : series.length;
  const chart = { type, series, rows, x };

  for (let s = 0; s < count; s += 1) {
    if (type === 'scatter') {
      const [r] = rowsByX(chart, s);

      if (r !== undefined) return { s, r };
    } else for (let r = 0; r < rows.length; r += 1) if (pointValue(chart, s, r) !== null) return { s, r };
  }

  return null;
}
