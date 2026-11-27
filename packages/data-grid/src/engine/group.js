/**
 * Row grouping with aggregates. Groups are ordered by their value (ascending unless the sort
 * model sorts that column), empty values last. Rows keep their incoming (already sorted) order.
 */
import { cellValue } from './columns.js';
import { getType, isEmpty } from './types.js';

/**
 * @typedef {import('./model.js').Column} Column
 * @typedef {import('./model.js').Row} Row
 * @typedef {import('./model.js').GroupNode} GroupNode
 * @typedef {import('./model.js').DisplayRow} DisplayRow
 * @typedef {(values: unknown[], column: Column) => unknown} Aggregate
 */

/**
 * Stable key for a group path, e.g. `["EU","Acme"]`.
 * @param {unknown[]} values
 */
export const groupKey = (values) => JSON.stringify(values);

/** @type {Record<string, Aggregate>} */
const AGGREGATES = {
  sum: (values) => {
    const nums = values.filter((v) => !isEmpty(v));

    return nums.length ? nums.reduce((/** @type {number} */ a, b) => a + Number(b), 0) : null;
  },
  avg: (values) => {
    const nums = values.filter((v) => !isEmpty(v));

    return nums.length ? /** @type {number} */ (nums.reduce((/** @type {number} */ a, b) => a + Number(b), 0)) / nums.length : null;
  },
  count: (values) => values.length,
  min: (values, column) => extreme(values, column, -1),
  max: (values, column) => extreme(values, column, 1),
};

/**
 * @param {unknown[]} values
 * @param {Column} column
 * @param {number} sign 1 for the largest value, -1 for the smallest.
 */
function extreme(values, column, sign) {
  const { compare } = getType(column.type);
  /** @type {unknown} */
  let best = null;

  for (const v of values) if (!isEmpty(v) && (best === null || compare(v, best, column) * sign > 0)) best = v;

  return best;
}

/**
 * @param {Row[]} leaves
 * @param {Column[]} aggregateColumns
 * @returns {Record<string, unknown>}
 */
function aggregatesFor(leaves, aggregateColumns) {
  /** @type {Record<string, unknown>} */
  const out = {};

  for (const column of aggregateColumns) {
    const values = leaves.map((row) => cellValue(row, column));
    const fn = typeof column.aggregate === 'function' ? column.aggregate : AGGREGATES[/** @type {string} */ (column.aggregate)];
    out[column.id] = fn ? fn(values, column) : null;
  }

  return out;
}

/**
 * Build a group tree.
 * @param {Row[]} rows
 * @param {string[]} groupBy column ids, outermost first
 * @param {Map<string, Column>} columnsById
 * @param {{ sortModel?: import('./model.js').SortKey[] }} [options]
 * @returns {GroupNode[]}
 */
export function groupRows(rows, groupBy, columnsById, { sortModel = [] } = {}) {
  const aggregateColumns = [...columnsById.values()].filter((c) => c.aggregate);
  // An id with no column (a stale saved view) is not a level.
  const levels = groupBy.flatMap((id) => columnsById.get(id) ?? []);

  /**
   * @param {Row[]} subset
   * @param {Column[]} remaining this level's column, then the deeper levels'
   * @param {unknown[]} path
   * @returns {GroupNode[]}
   */
  const build = (subset, remaining, path) => {
    const [column, ...deeper] = remaining;

    if (!column) return [];
    /** @type {Map<unknown, { value: unknown, rows: Row[] }>} */
    const buckets = new Map();

    for (const row of subset) {
      const value = cellValue(row, column);
      const k = isEmpty(value) ? '\u0000empty' : value instanceof Date ? value.getTime() : value;

      if (!buckets.has(k)) buckets.set(k, { value: isEmpty(value) ? null : value, rows: [] });
      const bucket = /** @type {{ value: unknown, rows: Row[] }} */ (buckets.get(k));
      bucket.rows.push(row);
    }

    const { compare } = getType(column.type);
    const factor = sortModel.find((s) => s.colId === column.id)?.direction === 'desc' ? -1 : 1;

    const ordered = [...buckets.values()].toSorted((a, b) => {
      if (a.value === null || b.value === null) return a.value === null ? (b.value === null ? 0 : 1) : -1;

      return compare(a.value, b.value, column) * factor;
    });

    return ordered.map(({ value, rows: leaves }) => {
      const valuePath = [...path, value];

      return {
        type: 'group',
        key: groupKey(valuePath),
        colId: column.id,
        value,
        level: path.length + 1,
        count: leaves.length,
        aggregates: aggregatesFor(leaves, aggregateColumns),
        children: build(leaves, deeper, valuePath),
        rows: leaves,
      };
    });
  };

  return build(rows, levels, []);
}

/**
 * Flatten a group tree into display rows. `expanded` is a Set of group keys, or 'all'.
 * Data rows carry `level` = number of grouping levels + 1 (for aria-level in a treegrid).
 * @param {GroupNode[]} tree
 * @param {'all' | Set<string> | null | undefined} expanded
 * @returns {DisplayRow[]}
 */
export function flattenGroups(tree, expanded) {
  /** @type {DisplayRow[]} */
  const out = [];
  const isOpen = (/** @type {string} */ key) => expanded === 'all' || expanded?.has?.(key);

  const walk = (/** @type {GroupNode[]} */ groups) => {
    for (const g of groups) {
      const open = Boolean(isOpen(g.key));
      out.push({
        type: 'group',
        key: g.key,
        colId: g.colId,
        value: g.value,
        level: g.level,
        count: g.count,
        aggregates: g.aggregates,
        expanded: open,
      });

      if (!open) continue;

      if (g.children.length) walk(g.children);
      else for (const row of g.rows) out.push({ type: 'row', row, level: g.level + 1 });
    }
  };

  walk(tree);

  return out;
}
