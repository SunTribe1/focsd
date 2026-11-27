/**
 * The data pipeline: rows → filter → sort → group → flatten → page. Each stage is memoised on
 * its own inputs, so paging or expanding a group does not re-filter or re-sort.
 */
import { displayColumns } from './columns.js';
import { filterRows } from './filter.js';
import * as sorting from './sort.js';
import { flattenGroups, groupRows } from './group.js';

/**
 * @typedef {import('./model.js').Column} Column
 * @typedef {import('./model.js').ColumnState} ColumnState
 * @typedef {import('./model.js').Row} Row
 * @typedef {import('./model.js').SortKey} SortKey
 * @typedef {import('./model.js').Filter} Filter
 * @typedef {import('./model.js').GroupNode} GroupNode
 * @typedef {import('./model.js').PipelineInput} PipelineInput
 * @typedef {import('./model.js').PipelineResult} PipelineResult
 */

/**
 * Memoise `fn` on a list of dependencies compared with Object.is.
 * @template {unknown[]} A
 * @template R
 * @param {(...args: A) => R} fn
 * @returns {(nextDeps: A) => R}
 */
function memo(fn) {
  /** @type {A | null} */
  let deps = null;
  /** @type {R | undefined} */
  let value;

  return (nextDeps) => {
    if (!deps || deps.length !== nextDeps.length || deps.some((d, i) => !Object.is(d, nextDeps[i]))) {
      deps = nextDeps;
      value = fn(...nextDeps);
    }

    return /** @type {R} */ (value);
  };
}

/**
 * Indexed display rows: the flattened groups when some group id names a column (ids from a stale
 * saved view are not levels), else the rows themselves.
 * @param {Row[]} rows
 * @param {GroupNode[]} groups
 * @param {string[]} groupBy
 * @param {Map<string, Column>} columnsById
 * @param {'all' | Set<string> | undefined} expanded
 * @returns {import('./model.js').IndexedDisplayRow[]}
 */
function displayRowsOf(rows, groups, groupBy, columnsById, expanded) {
  const grouped = groupBy.some((id) => columnsById.has(id));
  const list = grouped ? flattenGroups(groups, expanded) : rows.map((row) => ({ type: /** @type {const} */ ('row'), row, level: 1 }));

  return list.map((r, index) => ({ ...r, index }));
}

/**
 * Create a memoised pipeline. Call the returned function with the full grid input on every render.
 * @returns {(input: PipelineInput) => PipelineResult}
 */
export function createPipeline() {
  const byId = memo(
    /** @param {Column[]} columns */
    (columns) => new Map(columns.map((c) => [c.id, c])),
  );

  // Keyed on the joined ids, so a width change (new columnState object) does not bust the filter memo.
  const searchKey = memo(
    /**
     * @param {Column[]} columns
     * @param {ColumnState} columnState
     */
    (columns, columnState) =>
      displayColumns(columns, columnState)
        .map((c) => c.id)
        .join('\u0000'),
  );

  const searchIds = memo(
    /** @param {string} key */
    (key) => (key ? key.split('\u0000') : []),
  );

  const filtered = memo(
    /**
     * @param {Row[]} rows
     * @param {Record<string, Filter>} filterModel
     * @param {string} quickSearch
     * @param {string[]} ids
     * @param {Map<string, Column>} columnsById
     * @param {string | undefined} locale
     */
    (rows, filterModel, quickSearch, ids, columnsById, locale) =>
      filterRows(rows, filterModel, columnsById, { quickSearch, searchColumns: ids, locale }),
  );

  const sorted = memo(
    /**
     * @param {Row[]} rows
     * @param {SortKey[]} sortModel
     * @param {Map<string, Column>} columnsById
     */
    (rows, sortModel, columnsById) => sorting.sortRows(rows, sortModel, columnsById),
  );

  const tree = memo(
    /**
     * @param {Row[]} rows
     * @param {string[]} groupBy
     * @param {Map<string, Column>} columnsById
     * @param {SortKey[]} sortModel
     */
    (rows, groupBy, columnsById, sortModel) => groupRows(rows, groupBy, columnsById, { sortModel }),
  );

  const flat = memo(
    /**
     * @param {Row[]} rows
     * @param {GroupNode[]} groups
     * @param {string[]} groupBy
     * @param {Map<string, Column>} columnsById
     * @param {'all' | Set<string> | undefined} expanded
     */
    (rows, groups, groupBy, columnsById, expanded) => displayRowsOf(rows, groups, groupBy, columnsById, expanded),
  );

  return (input) => {
    const {
      rows,
      columns,
      columnState,
      sortModel = [],
      filterModel = {},
      quickSearch = '',
      groupBy = [],
      expanded,
      locale,
      external = false,
    } = input;

    const columnsById = byId([columns]);
    const ids = searchIds([searchKey([columns, columnState])]);
    const matchedRows = external ? rows : filtered([rows, filterModel, quickSearch, ids, columnsById, locale]);
    const sortedRows = external ? matchedRows : sorted([matchedRows, sortModel, columnsById]);
    const groups = tree([sortedRows, groupBy, columnsById, sortModel]);
    const displayRows = flat([sortedRows, groups, groupBy, columnsById, expanded]);
    const pageSize = Math.max(0, input.pageSize ?? 0);
    const pageCount = pageSize && !external ? Math.max(1, Math.ceil(displayRows.length / pageSize)) : 1;
    const page = Math.min(Math.max(1, input.page ?? 1), pageCount);
    const pageRows = pageSize && !external ? displayRows.slice((page - 1) * pageSize, page * pageSize) : displayRows;

    return { total: rows.length, matched: matchedRows.length, sortedRows, displayRows, pageRows, page, pageCount, pageSize };
  };
}
