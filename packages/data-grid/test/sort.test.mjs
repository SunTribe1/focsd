import { describe, expect, test } from 'vitest';
import { normalizeColumns } from '../src/engine/columns.js';
import { sortRows, toggleSort } from '../src/engine/sort.js';

const cols = normalizeColumns([{ id: 'name' }, { id: 'amount', type: 'number' }, { id: 'due', type: 'date' }]);
const byId = new Map(cols.map((c) => [c.id, c]));

const rows = [
  { name: 'b', amount: 2, due: '2026-01-02' },
  { name: 'a', amount: null, due: '2026-01-01' },
  { name: 'c', amount: 2, due: '2026-01-01' },
  { name: 'd', amount: 1, due: null },
];

describe('sort', () => {
  test('sorts by one key with nulls last in both directions', () => {
    expect(sortRows(rows, [{ colId: 'amount', direction: 'asc' }], byId).map((r) => r.name)).toEqual(['d', 'b', 'c', 'a']);
    expect(sortRows(rows, [{ colId: 'amount', direction: 'desc' }], byId).map((r) => r.name)).toEqual(['b', 'c', 'd', 'a']);
  });

  test('multi-key sort is stable and does not mutate input', () => {
    const copy = [...rows];

    const out = sortRows(
      rows,
      [
        { colId: 'amount', direction: 'desc' },
        { colId: 'due', direction: 'asc' },
      ],
      byId,
    );

    expect(out.map((r) => r.name)).toEqual(['c', 'b', 'd', 'a']);
    expect(rows).toEqual(copy);
    expect(sortRows(rows, [], byId)).toBe(rows);
  });

  test('toggleSort cycles asc, desc, none; multi keeps other keys', () => {
    let m = toggleSort([], 'name');
    expect(m).toEqual([{ colId: 'name', direction: 'asc' }]);
    m = toggleSort(m, 'name');
    expect(m).toEqual([{ colId: 'name', direction: 'desc' }]);
    expect(toggleSort(m, 'name')).toEqual([]);
    m = toggleSort(m, 'amount', { multi: true });
    expect(m).toEqual([
      { colId: 'name', direction: 'desc' },
      { colId: 'amount', direction: 'asc' },
    ]);
    expect(toggleSort(m, 'due')).toEqual([{ colId: 'due', direction: 'asc' }]);
  });
});
