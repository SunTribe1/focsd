import { describe, expect, test, vi } from 'vitest';
import { normalizeColumns, createColumnState } from '../src/engine/columns.js';
import { createPipeline } from '../src/engine/pipeline.js';
import { groupRows } from '../src/engine/group.js';
import { describeFilter, filterRows, matchesFilter } from '../src/engine/filter.js';
import { computeLayout } from '../src/view/body.js';

// State that names columns or operators that no longer exist (a stale saved view, or the
// `columns` property replaced) must degrade to "not applied", never to an empty or broken grid.

const columns = normalizeColumns([{ id: 'name' }, { id: 'team' }, { id: 'amount', type: 'number', width: 120 }]);
const byId = new Map(columns.map((c) => [c.id, c]));

const rows = [
  { id: 1, name: 'Ada', team: 'Blue', amount: 3 },
  { id: 2, name: 'Bo', team: 'Green', amount: 5 },
  { id: 3, name: 'Cy', team: 'Blue', amount: 7 },
];

const input = (groupBy) => ({
  rows,
  columns,
  columnState: createColumnState(columns),
  groupBy,
  expanded: 'all',
});

describe('stale grid state', () => {
  test('a groupBy of only unknown ids shows the flat rows', () => {
    const out = createPipeline()(input(['gone']));

    expect(out.displayRows.map((r) => r.type)).toEqual(['row', 'row', 'row']);
    expect(out.displayRows.map((r) => r.row?.id)).toEqual([1, 2, 3]);
    expect(out.displayRows[0]).toMatchObject({ level: 1, index: 0 });
  });

  test('a partly stale groupBy groups by the surviving id', () => {
    const out = createPipeline()(input(['gone', 'team']));
    const groups = out.displayRows.filter((r) => r.type === 'group');

    expect(groups.map((g) => [g.colId, g.value, g.level])).toEqual([
      ['team', 'Blue', 1],
      ['team', 'Green', 1],
    ]);
  });

  test('groupRows skips stale ids, alone and mixed with valid ones', () => {
    expect(groupRows(rows, ['gone'], byId)).toEqual([]);
    const tree = groupRows(rows, ['team', 'gone'], byId);

    expect(tree.map((g) => [g.colId, g.count, g.children.length])).toEqual([
      ['team', 2, 0],
      ['team', 1, 0],
    ]);
  });

  test('describeFilter names an operator the column type lacks by its id', () => {
    const amount = /** @type {any} */ (byId.get('amount'));

    expect(describeFilter({ op: 'nope', value: 1 }, amount)).toBe(`${amount.header} nope`);
  });

  test('an unknown operator does not filter: the row passes, with one warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const amount = /** @type {any} */ (byId.get('amount'));

      expect(matchesFilter(1, { op: 'stale-op', value: 9 }, amount)).toBe(true);
      expect(filterRows(rows, { amount: { op: 'stale-op', value: 9 } }, byId)).toHaveLength(3);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0]?.[0])).toContain('stale-op');
    } finally {
      warn.mockRestore();
    }
  });

  test('layout falls back to the declared width for a column with no recorded width', () => {
    const layout = computeLayout(columns, {}, { name: 200, team: 100 }, false);

    expect(layout.template).toBe(`200px 100px ${columns[2]?.width}px`);
    expect(columns[2]?.width).toBe(120);
  });
});
