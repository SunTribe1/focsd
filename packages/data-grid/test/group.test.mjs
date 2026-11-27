import { describe, expect, test } from 'vitest';
import { normalizeColumns } from '../src/engine/columns.js';
import { flattenGroups, groupKey, groupRows } from '../src/engine/group.js';

const cols = normalizeColumns([
  { id: 'region' },
  { id: 'customer' },
  { id: 'amount', type: 'number', aggregate: 'sum' },
  { id: 'score', type: 'number', aggregate: 'avg' },
  { id: 'due', type: 'date', aggregate: 'max' },
]);

const byId = new Map(cols.map((c) => [c.id, c]));

const rows = [
  { id: 1, region: 'EU', customer: 'A', amount: 10, score: 2, due: '2026-01-05' },
  { id: 2, region: 'US', customer: 'B', amount: 5, score: null, due: '2026-01-01' },
  { id: 3, region: 'EU', customer: 'B', amount: 7, score: 4, due: '2026-02-01' },
  { id: 4, region: null, customer: 'C', amount: 1, score: 1, due: null },
];

describe('grouping', () => {
  test('groups by one column with counts and aggregates; empty group last', () => {
    const tree = groupRows(rows, ['region'], byId);
    expect(tree.map((g) => [g.value, g.count])).toEqual([
      ['EU', 2],
      ['US', 1],
      [null, 1],
    ]);
    expect(tree[0].aggregates).toEqual({ amount: 17, score: 3, due: '2026-02-01' });
    expect(tree[1].aggregates.score).toBeNull();
    expect(tree[0].level).toBe(1);
  });

  test('nested groups and group direction from the sort model', () => {
    const tree = groupRows(rows, ['region', 'customer'], byId, { sortModel: [{ colId: 'region', direction: 'desc' }] });
    expect(tree.map((g) => g.value)).toEqual(['US', 'EU', null]);
    const eu = tree[1];
    expect(eu.children.map((g) => [g.value, g.level, g.count])).toEqual([
      ['A', 2, 1],
      ['B', 2, 1],
    ]);
    expect(eu.children[0].key).toBe(groupKey(['EU', 'A']));
  });

  test('flattenGroups shows only expanded branches, with levels for treegrid', () => {
    const tree = groupRows(rows, ['region'], byId);
    const collapsed = flattenGroups(tree, new Set());
    expect(collapsed.map((r) => r.type)).toEqual(['group', 'group', 'group']);
    const open = flattenGroups(tree, new Set([groupKey(['EU'])]));
    expect(open.map((r) => (r.type === 'group' ? `g:${r.value}:${r.expanded}` : `r:${r.row.id}:${r.level}`))).toEqual([
      'g:EU:true',
      'r:1:2',
      'r:3:2',
      'g:US:false',
      'g:null:false',
    ]);
    expect(flattenGroups(tree, 'all').filter((r) => r.type === 'row')).toHaveLength(4);
  });

  test('custom aggregate functions receive the leaf values', () => {
    const custom = normalizeColumns([{ id: 'region' }, { id: 'amount', type: 'number', aggregate: (values) => values.length * 100 }]);
    const tree = groupRows(rows, ['region'], new Map(custom.map((c) => [c.id, c])));
    expect(tree[0].aggregates.amount).toBe(200);
  });
});
