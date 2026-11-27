/**
 * Grid view state as plain JSON (for persistence and server mode). `sanitizeState` accepts
 * anything (saved state may be stale or hand-edited) and returns a valid state for `columns`.
 */
import { getType } from './types.js';

/**
 * @typedef {import('./model.js').Column} Column
 * @typedef {import('./model.js').Filter} Filter
 */

/**
 * @param {unknown} v
 * @returns {v is Record<string, unknown>}
 */
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * The value when it is a plain object, else an empty one.
 * @param {unknown} v
 * @returns {Record<string, unknown>}
 */
const record = (v) => (isObject(v) ? v : {});

/**
 * @param {unknown} input
 * @param {import('./model.js').Column[]} columns normalized columns
 * @returns {import('./model.js').GridState}
 */
export function sanitizeState(input, columns) {
  const raw = record(input);
  const byId = new Map(columns.map((c) => [c.id, c]));
  /**
   * @param {unknown} id
   * @returns {id is string}
   */
  const known = (id) => typeof id === 'string' && byId.has(id);
  const cs = record(raw.columnState);
  const savedHidden = record(cs.hidden);
  const savedWidths = record(cs.widths);
  const savedPinned = record(cs.pinned);

  const savedOrder = Array.isArray(cs.order) ? [...new Set(cs.order.filter(known))] : [];
  const order = [...savedOrder, ...columns.map((c) => c.id).filter((id) => !savedOrder.includes(id))];

  const hidden = Object.fromEntries(
    columns.map((c) => {
      const saved = savedHidden[c.id];

      return [c.id, typeof saved === 'boolean' ? saved : Boolean(c.hidden)];
    }),
  );

  const widths = Object.fromEntries(
    columns.map((c) => {
      const w = Number(savedWidths[c.id]);

      return [c.id, Number.isFinite(w) ? Math.round(Math.min(c.maxWidth, Math.max(c.minWidth, w))) : c.width];
    }),
  );

  const pinned = Object.fromEntries(
    columns.map((c) => {
      const side = savedPinned[c.id] ?? c.pinned;
      /** @type {[string, 'start' | 'end' | null]} */
      const entry = [c.id, side === 'start' || side === 'end' ? side : null];

      return entry;
    }),
  );

  /** @type {import('./model.js').SortKey[]} */
  const sortModel = [];

  for (const key of Array.isArray(raw.sortModel) ? raw.sortModel : []) {
    if (
      isObject(key) &&
      known(key.colId) &&
      (key.direction === 'asc' || key.direction === 'desc') &&
      !sortModel.some((k) => k.colId === key.colId)
    ) {
      sortModel.push({ colId: key.colId, direction: key.direction });
    }
  }

  /** @type {Record<string, Filter>} */
  const filterModel = {};

  for (const [colId, filter] of Object.entries(record(raw.filterModel))) {
    const clean = known(colId) && isObject(filter) ? sanitizeFilter(/** @type {Column} */ (byId.get(colId)), filter) : null;

    if (clean) filterModel[colId] = clean;
  }

  /**
   * @template {number | null} F
   * @param {unknown} v
   * @param {number} min
   * @param {F} fallback
   * @returns {number | F}
   */
  const int = (v, min, fallback) => (Number.isInteger(v) && /** @type {number} */ (v) >= min ? /** @type {number} */ (v) : fallback);

  return {
    columnState: { order, hidden, widths, pinned },
    sortModel,
    filterModel,
    quickSearch: typeof raw.quickSearch === 'string' ? raw.quickSearch : '',
    groupBy: Array.isArray(raw.groupBy) ? [...new Set(raw.groupBy.filter(known))] : [],
    expanded: raw.expanded === 'all' ? 'all' : Array.isArray(raw.expanded) ? raw.expanded.filter((k) => typeof k === 'string') : [],
    page: int(raw.page, 1, 1),
    pageSize: int(raw.pageSize, 0, null),
    density: raw.density === 'compact' ? 'compact' : 'comfortable',
  };
}

/**
 * A filter whose values fit its operator and the column type, or null (saved state may be stale).
 * @param {Column} column
 * @param {Record<string, unknown>} filter
 * @returns {Filter | null}
 */
function sanitizeFilter(column, filter) {
  const type = getType(column.type);

  if (typeof filter.op !== 'string') return null;
  const op = type.operators[filter.op];

  if (!op) return null;

  if (op.arity === 0) return { op: filter.op };

  if (op.arity === 'list') return Array.isArray(filter.value) ? { op: filter.op, value: [...filter.value] } : null;

  const operand = (/** @type {unknown} */ v) => {
    if (v === null || v === undefined || v === '') return undefined;

    if (column.type === 'number') return Number.isFinite(Number(v)) ? Number(v) : undefined;

    if (column.type === 'date') return 'error' in type.parse(String(v), column) ? undefined : String(v);

    return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? v : undefined;
  };

  const value = operand(filter.value);

  if (value === undefined) return null;

  if (op.arity === 1) return { op: filter.op, value };
  const value2 = operand(filter.value2);

  return value2 === undefined ? null : { op: filter.op, value, value2 };
}
