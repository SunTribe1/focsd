/**
 * Stable multi-column sort. Empty values always sort last, whatever the direction.
 */
import { cellValue } from './columns.js';
import { getType, isEmpty } from './types.js';

/**
 * @typedef {import('./model.js').Column} Column
 * @typedef {import('./model.js').SortKey} SortKey
 * @typedef {{ column: Column, compare: import('./model.js').ColumnTypeDef['compare'], factor: number }} RankKey
 */

/**
 * @param {import('./model.js').Row[]} rows
 * @param {SortKey[]} model
 * @param {Map<string, Column>} columnsById
 * @returns {import('./model.js').Row[]}
 */
export function sortRows(rows, model, columnsById) {
  const keys = /** @type {RankKey[]} */ (
    model
      .map(({ colId, direction }) => {
        const column = columnsById.get(colId);

        return column && { column, compare: getType(column.type).compare, factor: direction === 'desc' ? -1 : 1 };
      })
      .filter(Boolean)
  );

  if (!keys.length) return rows;

  // Rank each key's distinct values once with the type comparator, then sort on integer ranks:
  // far fewer (expensive) collator calls than comparing during the main sort.
  const ranks = keys.map((key) => {
    const values = rows.map((row) => cellValue(row, key.column));
    const distinct = [...new Set(values.filter((v) => !isEmpty(v)))].toSorted((x, y) => key.compare(x, y, key.column));
    // Values the comparator calls equal share a rank, so the next key decides between them.
    /** @type {Map<unknown, number>} */
    const rankOf = new Map();
    let rank = 0;
    distinct.forEach((v, i) => {
      if (i > 0 && key.compare(distinct[i - 1], v, key.column) !== 0) rank += 1;
      rankOf.set(v, rank);
    });

    return values.map((v) => (isEmpty(v) ? Infinity : /** @type {number} */ (rankOf.get(v)) * key.factor));
  });

  return rows
    .map((row, index) => ({ row, index }))
    .toSorted(({ index: a }, { index: b }) => {
      for (const r of ranks) {
        // Every rank list has one entry per row; a missing one sorts like an empty value.
        const x = r[a] ?? Infinity;
        const y = r[b] ?? Infinity;

        if (x === y) continue;

        if (x === Infinity) return 1;

        if (y === Infinity) return -1;

        return x - y;
      }

      return a - b;
    })
    .map(({ row }) => row);
}

/**
 * Next sort model when a header is activated: ascending, then descending, then unsorted.
 * With `multi`, other keys are kept (the column is appended or updated in place).
 * @param {SortKey[]} model
 * @param {string} colId
 * @param {{ multi?: boolean }} [options]
 * @returns {SortKey[]}
 */
export function toggleSort(model, colId, { multi = false } = {}) {
  const current = model.find((k) => k.colId === colId);
  const next = !current ? 'asc' : current.direction === 'asc' ? 'desc' : null;

  if (!multi) return next ? [{ colId, direction: next }] : [];

  if (!current) return [...model, { colId, direction: 'asc' }];

  return next ? model.map((k) => (k.colId === colId ? { colId, direction: next } : k)) : model.filter((k) => k.colId !== colId);
}

/**
 * Set a column's direction explicitly (column menu). `null` removes it.
 * @param {SortKey[]} model
 * @param {string} colId
 * @param {SortKey['direction'] | null | undefined} direction
 * @param {{ multi?: boolean }} [options]
 * @returns {SortKey[]}
 */
export function setSort(model, colId, direction, { multi = false } = {}) {
  if (!multi) return direction ? [{ colId, direction }] : [];
  const rest = model.filter((k) => k.colId !== colId);

  return direction ? [...rest, { colId, direction }] : rest;
}
