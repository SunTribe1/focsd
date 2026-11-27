/**
 * Column definitions and layout state. Definitions are static configuration; the layout
 * (order, visibility, widths, pinning) is user state, updated immutably.
 */
import { getType } from './types.js';

/**
 * @typedef {import('./model.js').Column} Column
 * @typedef {import('./model.js').ColumnState} ColumnState
 */

/**
 * Starting column widths (px) by type; any other type (text) gets TEXT_WIDTH.
 * @type {Record<string, number>}
 */
const DEFAULT_WIDTH = { number: 128, date: 144, boolean: 112, enum: 144 };
const TEXT_WIDTH = 176;

/** Default resize limits (px): narrow enough for an icon column, wide enough for prose. */
const MIN_WIDTH = 64;
const MAX_WIDTH = 800;

/**
 * Fill in defaults and check ids. Returns a new array of frozen column objects.
 * @param {import('./model.js').ColumnDef[]} defs
 * @returns {import('./model.js').Column[]}
 */
export function normalizeColumns(defs) {
  const seen = new Set();

  return defs.map((def) => {
    if (!def.id) throw new Error('Every column needs an id.');

    if (seen.has(def.id)) throw new Error(`Duplicate column id "${def.id}".`);
    seen.add(def.id);
    const type = def.type ?? 'text';
    getType(type);

    return Object.freeze({
      field: def.id,
      header: def.id,
      width: DEFAULT_WIDTH[type] ?? TEXT_WIDTH,
      minWidth: MIN_WIDTH,
      maxWidth: MAX_WIDTH,
      pinned: null,
      hidden: false,
      sortable: true,
      filterable: true,
      resizable: true,
      editable: false,
      groupable: true,
      searchable: true,
      required: false,
      ...def,
      type,
    });
  });
}

/**
 * The value a column shows for a row.
 * @param {import('./model.js').Row | null | undefined} row
 * @param {Pick<Column, 'field' | 'valueGetter'>} column
 * @returns {unknown}
 */
export const cellValue = (row, column) => (column.valueGetter ? column.valueGetter(row) : row?.[column.field]);

/** Initial layout state from the definitions. */
/**
 * @param {import('./model.js').Column[]} columns
 * @returns {import('./model.js').ColumnState}
 */
export function createColumnState(columns) {
  return {
    order: columns.map((c) => c.id),
    hidden: Object.fromEntries(columns.map((c) => [c.id, Boolean(c.hidden)])),
    widths: Object.fromEntries(columns.map((c) => [c.id, c.width])),
    pinned: Object.fromEntries(columns.map((c) => [c.id, c.pinned ?? null])),
  };
}

/**
 * Visible columns in display order: pinned to start, then center, then pinned to end.
 * @param {Column[]} columns
 * @param {ColumnState} state
 * @returns {Column[]}
 */
export function displayColumns(columns, state) {
  const byId = new Map(columns.map((c) => [c.id, c]));
  const ordered = /** @type {Column[]} */ (state.order.map((id) => byId.get(id)).filter((c) => c && !state.hidden[c.id]));
  const side = (/** @type {Column} */ c) => state.pinned[c.id] ?? null;

  return [...ordered.filter((c) => side(c) === 'start'), ...ordered.filter((c) => !side(c)), ...ordered.filter((c) => side(c) === 'end')];
}

/**
 * @param {ColumnState} state
 * @param {string} id
 * @param {number} toIndex
 * @returns {ColumnState}
 */
export function moveColumn(state, id, toIndex) {
  const order = state.order.filter((x) => x !== id);
  const index = Math.max(0, Math.min(toIndex, order.length));

  return { ...state, order: [...order.slice(0, index), id, ...order.slice(index)] };
}

/**
 * @param {ColumnState} state
 * @param {string} id
 * @param {boolean} hidden
 * @returns {ColumnState}
 */
export const setHidden = (state, id, hidden) => ({ ...state, hidden: { ...state.hidden, [id]: hidden } });

/**
 * @param {ColumnState} state
 * @param {string} id
 * @param {string | null | undefined} side 'start' or 'end'; anything else unpins.
 * @returns {ColumnState}
 */
export const setPinned = (state, id, side) => ({
  ...state,
  pinned: { ...state.pinned, [id]: side === 'start' || side === 'end' ? side : null },
});

/**
 * @param {ColumnState} state
 * @param {Column[]} columns
 * @param {string} id
 * @param {number} width
 * @returns {ColumnState}
 */
export function setWidth(state, columns, id, width) {
  const column = columns.find((c) => c.id === id);
  const clamped = Math.round(Math.min(column?.maxWidth ?? MAX_WIDTH, Math.max(column?.minWidth ?? MIN_WIDTH, width)));

  return { ...state, widths: { ...state.widths, [id]: clamped } };
}
