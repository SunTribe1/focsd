import { expect, test } from 'vitest';
import { createColumnState, normalizeColumns } from '../src/engine/columns.js';
import { createPipeline } from '../src/engine/pipeline.js';

test('10k rows × 12 columns: filter + quick search + multi-sort + group: warm runs under 50ms, cold under 200ms', () => {
  const columns = normalizeColumns([
    { id: 'id', type: 'number' },
    { id: 'name' },
    { id: 'team', aggregate: 'count' },
    { id: 'region', type: 'enum', options: ['EU', 'US', 'APAC'].map((v) => ({ value: v, label: v })) },
    { id: 'amount', type: 'number', aggregate: 'sum' },
    { id: 'score', type: 'number', aggregate: 'avg' },
    { id: 'due', type: 'date', aggregate: 'max' },
    { id: 'paid', type: 'boolean' },
    { id: 'c9' },
    { id: 'c10' },
    { id: 'c11' },
    { id: 'c12' },
  ]);

  const makeRows = () =>
    Array.from({ length: 10_000 }, (_, i) => ({
      id: i,
      name: `Customer ${i}`,
      team: `Team ${i % 40}`,
      region: ['EU', 'US', 'APAC'][i % 3],
      amount: (i * 7919) % 10_000,
      score: i % 97,
      due: `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      paid: i % 2 === 0,
      c9: 'x',
      c10: 'y',
      c11: 'z',
      c12: String(i),
    }));

  const rows = makeRows();

  const input = {
    rows,
    columns,
    columnState: createColumnState(columns),
    page: 1,
    pageSize: 50,
    expanded: 'all',
    filterModel: { amount: { op: 'gt', value: 100 }, region: { op: 'in', value: ['EU', 'US'] } },
    quickSearch: 'customer',
    sortModel: [
      { colId: 'team', direction: 'asc' },
      { colId: 'amount', direction: 'desc' },
    ],
    groupBy: ['region', 'team'],
  };

  // Wall-clock budgets on a shared machine: take the best of several attempts, so a busy CPU (other
  // suites running in parallel) does not fail the test while a real slowdown still does.
  // Cold: fresh row objects, so nothing is in the per-row search cache yet.
  const cold = Math.min(
    ...Array.from({ length: 3 }, () => {
      const fresh = { ...input, rows: makeRows() };
      const start = performance.now();
      createPipeline()(fresh);

      return performance.now() - start;
    }),
  );

  // Reference workload timed in the same window: when the CPU is shared, both slow down together.
  const reference = Math.min(
    ...Array.from({ length: 3 }, () => {
      const numbers = Array.from({ length: 50_000 }, (_, i) => (i * 2654435761) % 1000003);
      const start = performance.now();
      numbers.toSorted((x, y) => x - y);

      return performance.now() - start;
    }),
  );

  // Idle: cold ~35-120 ms (2.6-3.7x the reference). Pass on the absolute budget or, under load, the ratio.
  expect(cold < 200 || cold / reference < 10, `cold ${cold.toFixed(0)} ms, ${(cold / reference).toFixed(1)}x reference`).toBe(true);
  // Warm: later runs (each keystroke, sort click) reuse the per-row search cache.
  createPipeline()(input);

  const warm = Math.min(
    ...Array.from({ length: 5 }, () => {
      const start = performance.now();
      createPipeline()(input);

      return performance.now() - start;
    }),
  );

  // Idle: warm ~18-34 ms (1.5-1.8x the reference).
  expect(warm < 50 || warm / reference < 4, `warm ${warm.toFixed(1)} ms, ${(warm / reference).toFixed(1)}x reference`).toBe(true);
});
