// The `detail` of each focsd-data-grid event (docs/events.md). Types only.

/**
 * @typedef {import('./engine/model.js').SortKey} SortKey
 * @typedef {import('./engine/model.js').Filter} Filter
 * @typedef {import('./engine/model.js').ColumnState} ColumnState
 * @typedef {import('./engine/model.js').GridState} GridState
 * @typedef {import('./engine/model.js').Row} Row
 */

/**
 * `focsd-sort-change`: the sort model, outermost key first.
 * @typedef {{ sortModel: SortKey[] }} SortChangeDetail
 */

/**
 * `focsd-filter-change`: the column filters, by column id.
 * @typedef {{ filterModel: Record<string, Filter> }} FilterChangeDetail
 */

/**
 * `focsd-search-change`: the quick search text.
 * @typedef {{ quickSearch: string }} SearchChangeDetail
 */

/**
 * `focsd-column-change`: column order, visibility, widths and pinning.
 * @typedef {{ columnState: ColumnState }} ColumnChangeDetail
 */

/**
 * `focsd-group-change`: the grouped column ids, outermost first.
 * @typedef {{ groupBy: string[] }} GroupChangeDetail
 */

/**
 * `focsd-selection-change`: the ids of the selected rows.
 * @typedef {{ ids: unknown[] }} SelectionChangeDetail
 */

/**
 * `focsd-page-change`: the new page, the same shape focsd-pagination fires.
 * @typedef {import('@focsd-dev/primitives').PageChangeDetail} PageChangeDetail
 */

/**
 * `focsd-cell-edit` (cancelable): the edit about to be applied.
 * @typedef {{ rowId: unknown, colId: string, oldValue: unknown, newValue: unknown, row: Row }} CellEditDetail
 */

/**
 * `focsd-state-change` (debounced): the same object `getState()` returns.
 * @typedef {{ state: GridState }} StateChangeDetail
 */

/**
 * `focsd-row-activate`: Enter on a read-only cell; the row and its id.
 * @typedef {{ id: unknown, row: Row }} RowActivateDetail
 */

export {};
