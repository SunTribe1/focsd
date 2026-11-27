/**
 * Grid navigation maths, kept free of DOM so it is easy to reason about.
 * Positions: row 0 is the header row; rows 1..n are display rows. Columns are 0-based over the
 * rendered column keys (the selection column, when present, is key 'select' at 0).
 */

/**
 * Target position for a navigation key, or null when the key is not a navigation key.
 * @param {KeyboardEvent} event
 * @param {{ row: number, col: number }} at
 * @param {{ rows: number, cols: number, pageRows: number, rtl: boolean }} size
 * @returns {{ row: number, col: number, page?: number } | null}
 */
export function navigate(event, at, size) {
  const ctrl = event.ctrlKey || event.metaKey;
  const lastRow = size.rows;
  const lastCol = size.cols - 1;
  /** @param {number} r */
  const clampRow = (r) => Math.max(0, Math.min(lastRow, r));
  /** @param {number} c */
  const clampCol = (c) => Math.max(0, Math.min(lastCol, c));
  const forward = size.rtl ? -1 : 1;

  switch (event.key) {
    case 'ArrowRight':
      return { row: at.row, col: clampCol(at.col + forward) };
    case 'ArrowLeft':
      return { row: at.row, col: clampCol(at.col - forward) };
    case 'ArrowDown':
      return { row: clampRow(at.row + 1), col: at.col };
    case 'ArrowUp':
      return { row: clampRow(at.row - 1), col: at.col };
    case 'Home':
      return ctrl ? { row: 0, col: 0 } : { row: at.row, col: 0 };
    case 'End':
      return ctrl ? { row: lastRow, col: lastCol } : { row: at.row, col: lastCol };
    case 'PageDown':
      return { row: clampRow(at.row + size.pageRows), col: at.col, page: 1 };
    case 'PageUp':
      return { row: clampRow(at.row - size.pageRows), col: at.col, page: -1 };
    default:
      return null;
  }
}

/**
 * Data-row ids between two display positions (inclusive), skipping group rows.
 * @param {import('../mixins/host.js').DisplayRow[]} displayRows
 * @param {number} from
 * @param {number} to
 * @param {(row: import('../mixins/host.js').GridRow) => unknown} getId
 * @returns {unknown[]}
 */
export function rangeIds(displayRows, from, to, getId) {
  const [a, b] = from <= to ? [from, to] : [to, from];

  return displayRows
    .slice(a, b + 1)
    .filter((r) => r.type === 'row')
    .map((r) => getId(/** @type {Extract<import('../mixins/host.js').DisplayRow, { type: 'row' }>} */ (r).row));
}
