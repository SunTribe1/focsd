import { describe, expect, test } from 'vitest';
import {
  cellValue,
  createColumnState,
  displayColumns,
  moveColumn,
  normalizeColumns,
  setHidden,
  setPinned,
  setWidth,
} from '../src/engine/columns.js';

const defs = [
  { id: 'name', header: 'Name' },
  { id: 'amount', header: 'Amount', type: 'number', width: 90 },
  { id: 'status', header: 'Status', type: 'enum', options: [{ value: 'paid', label: 'Paid' }], pinned: 'end' },
  { id: 'total', header: 'Total', type: 'number', valueGetter: (r) => r.amount * 2, hidden: true },
];

describe('columns', () => {
  test('normalizes defaults and validates ids', () => {
    const cols = normalizeColumns(defs);
    expect(cols[0]).toMatchObject({
      id: 'name',
      field: 'name',
      type: 'text',
      sortable: true,
      filterable: true,
      editable: false,
      pinned: null,
    });
    expect(cols[1].width).toBe(90);
    expect(() => normalizeColumns([{ id: 'a' }, { id: 'a' }])).toThrow(/Duplicate column id "a"/);
    expect(() => normalizeColumns([{ header: 'x' }])).toThrow(/needs an id/);
  });

  test('cellValue reads field or valueGetter', () => {
    const columns = normalizeColumns(defs);
    const [name] = columns;
    const total = columns[3];
    expect(cellValue({ name: 'A', amount: 2 }, name)).toBe('A');
    expect(cellValue({ amount: 2 }, total)).toBe(4);
  });

  test('display order: start pinned, centre, end pinned; hidden excluded', () => {
    const cols = normalizeColumns(defs);
    let state = createColumnState(cols);
    expect(displayColumns(cols, state).map((c) => c.id)).toEqual(['name', 'amount', 'status']);
    state = setPinned(state, 'amount', 'start');
    expect(displayColumns(cols, state).map((c) => c.id)).toEqual(['amount', 'name', 'status']);
    state = setHidden(state, 'total', false);
    state = moveColumn(state, 'total', 0);
    expect(displayColumns(cols, state).map((c) => c.id)).toEqual(['amount', 'total', 'name', 'status']);
  });

  test('state updates are immutable and widths are clamped', () => {
    const cols = normalizeColumns(defs);
    const state = createColumnState(cols);
    const wider = setWidth(state, cols, 'amount', 5000);
    expect(wider).not.toBe(state);
    expect(state.widths.amount).toBe(90);
    expect(wider.widths.amount).toBe(800);
    expect(setWidth(state, cols, 'amount', 1).widths.amount).toBe(64);
  });
});
