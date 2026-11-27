/**
 * Column filters (ANDed together) and quick search over formatted values.
 */
import { cellValue } from './columns.js';
import { warnOnce } from '@focsd/primitives/internal';
import { fold, getType } from './types.js';

/**
 * @typedef {import('./model.js').Column} Column
 * @typedef {import('./model.js').Filter} Filter
 * @typedef {import('./model.js').FilterOperator} FilterOperator
 * @typedef {import('./model.js').Row} Row
 *
 * @typedef {object} FilterWords Localized words for describeFilter.
 * @property {string} [or]
 * @property {(header: string, from: string, to: string) => string} [between]
 * @property {(id: string, op: FilterOperator) => string | undefined} [symbol]
 * @property {(id: string, op: FilterOperator) => string | undefined} [label]
 */

/**
 * Operators available for a column, with ids and labels for building a UI.
 * @param {Pick<Column, 'type'>} column
 * @returns {{ id: string, label: string, arity: FilterOperator['arity'] }[]}
 */
export function operatorsFor(column) {
  return Object.entries(getType(column.type).operators).map(([id, op]) => ({ id, label: op.label, arity: op.arity }));
}

/**
 * True when `value` passes `filter` (`{ op, value, value2 }`) for this column. An operator the
 * column type lacks (a stale saved view) applies no constraint: the value passes, with a warning.
 * @param {unknown} value
 * @param {Filter} filter
 * @param {Column} column
 * @returns {boolean}
 */
export function matchesFilter(value, filter, column) {
  const op = getType(column.type).operators[filter.op];

  if (!op) {
    warnOnce(
      `data-grid-filter-op:${column.id}:${filter.op}`,
      `unknown filter operator "${filter.op}" for ${column.type} column "${column.id}"; the filter is ignored.`,
    );

    return true;
  }

  return op.test(value, filter.value, filter.value2, column);
}

/**
 * Rows passing every column filter and the quick search. Returns `rows` itself when nothing applies.
 * @param {Row[]} rows
 * @param {Record<string, Filter>} model
 * @param {Map<string, Column>} columnsById
 * @param {{ quickSearch?: string, searchColumns?: string[], locale?: string }} [options]
 * @returns {Row[]}
 */
export function filterRows(rows, model, columnsById, { quickSearch = '', searchColumns, locale } = {}) {
  const filters = /** @type {{ column: Column, filter: Filter }[]} */ (
    Object.entries(model ?? {})
      .map(([colId, filter]) => ({ column: columnsById.get(colId), filter }))
      .filter((f) => f.column && f.filter)
  );

  const tokens = fold(quickSearch).split(/\s+/).filter(Boolean);

  if (!filters.length && !tokens.length) return rows;

  const searchable = /** @type {Column[]} */ (
    (searchColumns ?? [...columnsById.keys()]).map((id) => columnsById.get(id)).filter((c) => c?.searchable)
  );

  const getters = searchable.map((column) => searchTextGetter(column, locale));

  return rows.filter((row) => {
    for (const { column, filter } of filters) if (!matchesFilter(cellValue(row, column), filter, column)) return false;

    // Every token must appear in some column. Columns are formatted lazily and checks stop early.
    return tokens.every((token) => getters.some((get) => get(row).includes(token)));
  });
}

/**
 * Folded display text of a column for a row. Cached per row object (rows are immutable: an edit
 * makes a new object), per column definition and locale, so repeated searches while typing reuse work.
 */
/** @type {WeakMap<Row, Map<string, { column: Column, text: string }>>} */
const rowTextCache = new WeakMap();

/**
 * @param {Column} column
 * @param {string} [locale]
 * @returns {(row: Row) => string}
 */
function searchTextGetter(column, locale) {
  const { format } = getType(column.type);
  const key = `${column.id}\u0000${locale ?? ''}`;

  return (row) => {
    let perRow = rowTextCache.get(row);

    if (!perRow) {
      perRow = new Map();
      rowTextCache.set(row, perRow);
    }

    const hit = perRow.get(key);

    if (hit !== undefined && hit.column === column) return hit.text;
    const text = fold(format(cellValue(row, column), column, locale));
    perRow.set(key, { column, text });

    return text;
  };
}

/**
 * Short human-readable text for a filter, used on chips and in announcements.
 * @param {Filter} filter
 * @param {Column} column
 * @param {string} [locale]
 * @param {FilterWords} [words]
 * @returns {string}
 */
export function describeFilter(filter, column, locale, words = {}) {
  const type = getType(column.type);
  const op = type.operators[filter.op];

  // An operator this column type lacks (a stale saved view): name it rather than fail.
  if (!op) return `${column.header} ${filter.op}`;
  const show = (/** @type {unknown} */ v) => type.format(v, column, locale);
  // `words` localizes the sentence: { or, between(header, from, to), symbol(id, op), label(id, op) }.
  const symbol = words.symbol?.(filter.op, op) ?? op.symbol;

  if (op.arity === 'list') {
    const labels = [filter.value ?? []].flat().map(show);

    return `${column.header} ${symbol} ${labels.join(` ${words.or ?? 'or'} `)}`;
  }

  if (op.arity === 0) return `${column.header} ${words.label?.(filter.op, op) ?? op.label}`;

  if (op.arity === 2) {
    return words.between
      ? words.between(column.header, show(filter.value), show(filter.value2))
      : `${column.header} between ${show(filter.value)} and ${show(filter.value2)}`;
  }

  return `${column.header} ${symbol} ${show(filter.value)}`;
}
