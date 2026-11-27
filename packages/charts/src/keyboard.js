/**
 * Arrow-key, Home and End navigation between points. Pure: it returns where focus should go.
 * The plot is drawn left to right in every direction, so arrows move visually; with `mirror` the
 * plot runs right to left and Left/Right swap to follow it.
 */
import { rowsByX, xValue } from './data.js';

/** @typedef {Pick<import('./types.js').ChartContext, 'type' | 'rows' | 'series' | 'hasPoint'> & { x?: string, mirror?: boolean }} KeyboardContext */
/** @typedef {[number, number] | null} Target */

/** Left and Right in a mirrored plot. */
const MIRRORED = /** @type {Record<string, string>} */ ({ ArrowLeft: 'ArrowRight', ArrowRight: 'ArrowLeft' });

/**
 * The next drawn point from (s, r) for `key`, staying put at an edge; null for other keys.
 * @param {KeyboardContext} ctx
 * @param {{ s: number, r: number }} from
 * @param {string} key
 * @returns {Target}
 */
export function nextPoint(ctx, from, key) {
  const k = ctx.mirror ? (MIRRORED[key] ?? key) : key;
  const move = (ctx.type === 'scatter' ? scatterMoves : gridMoves)(ctx, from)[k];

  return move ? (move() ?? [from.s, from.r]) : null;
}

/**
 * Categories and series form a grid: Left/Right move along the series, Up/Down across series.
 * @param {KeyboardContext} ctx
 * @param {{ s: number, r: number }} from
 * @returns {Record<string, () => Target>}
 */
function gridMoves({ rows, series, hasPoint }, { s, r }) {
  /** @param {number} ds @param {number} dr @returns {Target} */
  const step = (ds, dr) => {
    for (let ns = s + ds, nr = r + dr; ns >= 0 && ns < series.length && nr >= 0 && nr < rows.length; ns += ds, nr += dr)
      if (hasPoint(ns, nr)) return [ns, nr];

    return null;
  };

  /** @param {number} start @param {number} dr @returns {Target} */
  const inRow = (start, dr) => {
    for (let nr = start; nr >= 0 && nr < rows.length; nr += dr) if (hasPoint(s, nr)) return [s, nr];

    return null;
  };

  return {
    ArrowRight: () => step(0, 1),
    ArrowLeft: () => step(0, -1),
    ArrowDown: () => step(1, 0),
    ArrowUp: () => step(-1, 0),
    Home: () => inRow(0, 1),
    End: () => inRow(rows.length - 1, -1),
  };
}

/**
 * Scatter: Left/Right move to the previous/next point by x within the series, Up/Down to the
 * nearest x in the previous/next series that has points, Home/End to the ends of the series.
 * @param {KeyboardContext} ctx
 * @param {{ s: number, r: number }} from
 * @returns {Record<string, () => Target>}
 */
function scatterMoves(ctx, { s, r }) {
  const order = rowsByX(ctx, s);
  const at = order.indexOf(r);
  /** @param {number} i @returns {Target} */
  const nth = (i) => (order[i] === undefined ? null : [s, /** @type {number} */ (order[i])]);
  const x = xValue(ctx.rows[r], ctx.x) ?? 0;

  /** @param {number} ds @returns {Target} */
  const across = (ds) => {
    for (let ns = s + ds; ns >= 0 && ns < ctx.series.length; ns += ds) {
      const near = rowsByX(ctx, ns).reduce(
        (best, nr) => {
          const gap = Math.abs((xValue(ctx.rows[nr], ctx.x) ?? 0) - x);

          return gap < best.gap ? { nr, gap } : best;
        },
        { nr: -1, gap: Infinity },
      );

      if (near.nr >= 0) return [ns, near.nr];
    }

    return null;
  };

  return {
    ArrowRight: () => nth(at + 1),
    ArrowLeft: () => nth(at - 1),
    ArrowDown: () => across(1),
    ArrowUp: () => across(-1),
    Home: () => nth(0),
    End: () => nth(order.length - 1),
  };
}
