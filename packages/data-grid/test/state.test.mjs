import { describe, expect, test } from 'vitest';
import { normalizeColumns } from '../src/engine/columns.js';
import { sanitizeState } from '../src/engine/state.js';

const columns = normalizeColumns([{ id: 'name' }, { id: 'amount', type: 'number' }]);

describe('state', () => {
  test('keeps valid parts and drops unknown columns, operators and junk', () => {
    const state = sanitizeState(
      {
        columnState: {
          order: ['amount', 'ghost', 'name'],
          hidden: { name: true, ghost: true },
          widths: { amount: 9999 },
          pinned: { amount: 'start', name: 'middle' },
        },
        sortModel: [
          { colId: 'amount', direction: 'desc' },
          { colId: 'ghost', direction: 'asc' },
          { colId: 'name', direction: 'sideways' },
        ],
        filterModel: { amount: { op: 'gt', value: 5 }, name: { op: 'nonsense' }, ghost: { op: 'eq', value: 1 } },
        quickSearch: 42,
        groupBy: ['name', 'ghost'],
        expanded: ['["a"]'],
        page: -3,
        pageSize: 25,
        density: 'tiny',
      },
      columns,
    );

    expect(state.columnState.order).toEqual(['amount', 'name']);
    expect(state.columnState.hidden).toEqual({ name: true, amount: false });
    expect(state.columnState.widths.amount).toBe(800);
    expect(state.columnState.pinned).toEqual({ amount: 'start', name: null });
    expect(state.sortModel).toEqual([{ colId: 'amount', direction: 'desc' }]);
    expect(state.filterModel).toEqual({ amount: { op: 'gt', value: 5 } });
    expect(state.quickSearch).toBe('');
    expect(state.groupBy).toEqual(['name']);
    expect(state.expanded).toEqual(['["a"]']);
    expect(state.page).toBe(1);
    expect(state.pageSize).toBe(25);
    expect(state.density).toBe('comfortable');
  });

  test('missing columns in a saved order are appended so new columns still show', () => {
    const state = sanitizeState({ columnState: { order: ['amount'] } }, columns);
    expect(state.columnState.order).toEqual(['amount', 'name']);
  });

  test('survives JSON round trip', () => {
    const s = sanitizeState({ sortModel: [{ colId: 'name', direction: 'asc' }] }, columns);
    expect(sanitizeState(JSON.parse(JSON.stringify(s)), columns)).toEqual(s);
  });
});
