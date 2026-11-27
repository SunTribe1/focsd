/**
 * Stacking for `stacked` bar and area charts. Pure: no DOM, no element state.
 * Positive values stack up from zero and negative values stack down from zero, separately, so a
 * negative segment never hides a positive one.
 */

/** @typedef {{ base: number, top: number }} StackSpan Where a segment starts and ends on the value axis. */

/**
 * @typedef {object} Stack
 * @property {(s: number, r: number) => StackSpan | null} span The segment of a drawn value, else null.
 * @property {number[]} totals The sum of each row's drawn values.
 * @property {number} min The lowest stacked end (0 or below).
 * @property {number} max The highest stacked end (0 or above).
 */

/**
 * @param {(s: number, r: number) => number | null} valueAt
 * @param {number} seriesCount
 * @param {number} rowCount
 * @returns {Stack}
 */
export function stackValues(valueAt, seriesCount, rowCount) {
  /** @type {Map<string, StackSpan>} */
  const spans = new Map();
  const totals = [];
  let min = 0;
  let max = 0;

  for (let r = 0; r < rowCount; r += 1) {
    let up = 0;
    let down = 0;
    let total = 0;

    for (let s = 0; s < seriesCount; s += 1) {
      const v = valueAt(s, r);

      if (v === null) continue;
      total += v;

      if (v >= 0) {
        spans.set(`${s}:${r}`, { base: up, top: up + v });
        up += v;
      } else {
        spans.set(`${s}:${r}`, { base: down, top: down + v });
        down += v;
      }
    }

    totals.push(total);
    min = Math.min(min, down);
    max = Math.max(max, up);
  }

  return { span: (s, r) => spans.get(`${s}:${r}`) ?? null, totals, min, max };
}
