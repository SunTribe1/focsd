import { FocsdDataGrid } from './grid.js';
import { defineElement } from '@focsd-dev/primitives/internal';

export { FocsdDataGrid };

/**
 * @typedef {import('./events.js').SortChangeDetail} SortChangeDetail
 * @typedef {import('./events.js').FilterChangeDetail} FilterChangeDetail
 * @typedef {import('./events.js').SearchChangeDetail} SearchChangeDetail
 * @typedef {import('./events.js').ColumnChangeDetail} ColumnChangeDetail
 * @typedef {import('./events.js').GroupChangeDetail} GroupChangeDetail
 * @typedef {import('./events.js').SelectionChangeDetail} SelectionChangeDetail
 * @typedef {import('./events.js').PageChangeDetail} PageChangeDetail
 * @typedef {import('./events.js').CellEditDetail} CellEditDetail
 * @typedef {import('./events.js').StateChangeDetail} StateChangeDetail
 * @typedef {import('./events.js').RowActivateDetail} RowActivateDetail
 */

/**
 * The model types (types I2): `const columns: ColumnDef<Person>[] = ...`.
 * @template [T=any]
 * @typedef {import('./engine/model.js').ColumnDef<T>} ColumnDef
 */
/**
 * @typedef {import('./engine/model.js').ColumnType} ColumnType
 * @typedef {import('./engine/model.js').ColumnOption} ColumnOption
 * @typedef {import('./engine/model.js').ColumnState} ColumnState
 * @typedef {import('./engine/model.js').SortKey} SortKey
 * @typedef {import('./engine/model.js').Filter} Filter
 * @typedef {import('./engine/model.js').GridState} GridState
 * @typedef {import('./engine/model.js').GridDensity} GridDensity
 * @typedef {import('./engine/model.js').EditResult} EditResult
 * @typedef {import('./engine/model.js').Row} Row
 * @typedef {import('./engine/model.js').FilterOperator} FilterOperator
 * @typedef {import('./engine/model.js').ColumnTypeDef} ColumnTypeDef
 */

export * from './engine/index.js';

defineElement('focsd-data-grid', FocsdDataGrid);
