import { describe, expect, test, vi } from 'vitest';
import { normalizeColumns, createColumnState } from '../src/engine/columns.js';
import { createPipeline } from '../src/engine/pipeline.js';
import * as sortModule from '../src/engine/sort.js';

const columns = normalizeColumns([{ id: 'name' }, { id: 'team' }, { id: 'amount', type: 'number', aggregate: 'sum' }]);
const rows = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, name: `Row ${i + 1}`, team: i % 2 ? 'Blue' : 'Green', amount: i }));

const base = {
  rows,
  columns,
  columnState: createColumnState(columns),
  sortModel: [],
  filterModel: {},
  quickSearch: '',
  groupBy: [],
  expanded: new Set(),
  page: 1,
  pageSize: 10,
};

describe('pipeline', () => {
  test('filters, sorts, pages and reports counts', () => {
    const run = createPipeline();
    const out = run({ ...base, filterModel: { amount: { op: 'gte', value: 10 } }, sortModel: [{ colId: 'amount', direction: 'desc' }] });
    expect(out.total).toBe(30);
    expect(out.matched).toBe(20);
    expect(out.pageCount).toBe(2);
    expect(out.pageRows.map((r) => r.row.amount).slice(0, 3)).toEqual([29, 28, 27]);
    expect(out.pageRows[0]).toMatchObject({ type: 'row', index: 0 });
  });

  test('pageSize 0 returns every display row; page is clamped', () => {
    const run = createPipeline();
    expect(run({ ...base, pageSize: 0 }).pageRows).toHaveLength(30);
    expect(run({ ...base, page: 99 }).page).toBe(3);
  });

  test('grouping produces group rows with aggregates', () => {
    const run = createPipeline();
    const out = run({ ...base, groupBy: ['team'], pageSize: 0 });
    expect(out.displayRows.map((r) => r.type)).toEqual(['group', 'group']);
    expect(out.displayRows[0]).toMatchObject({ value: 'Blue', count: 15, aggregates: { amount: 225 } });
  });

  test('stages are memoised: changing only the page does not re-sort', () => {
    const spy = vi.spyOn(sortModule, 'sortRows');
    const run = createPipeline();
    const input = { ...base, sortModel: [{ colId: 'amount', direction: 'asc' }] };
    run(input);
    run({ ...input, page: 2 });
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
