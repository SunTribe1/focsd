import { describe, expect, test } from 'vitest';
import { normalizeColumns } from '../src/engine/columns.js';
import { describeFilter, filterRows, matchesFilter, operatorsFor } from '../src/engine/filter.js';
import { fold } from '../src/engine/types.js';

const cols = normalizeColumns([
  { id: 'name', header: 'Name' },
  { id: 'amount', header: 'Amount', type: 'number' },
  { id: 'due', header: 'Due', type: 'date' },
  { id: 'paid', header: 'Paid', type: 'boolean' },
  {
    id: 'status',
    header: 'Status',
    type: 'enum',
    options: [
      { value: 'open', label: 'Open' },
      { value: 'late', label: 'Late' },
    ],
  },
]);

const byId = new Map(cols.map((c) => [c.id, c]));
const col = (id) => byId.get(id);

const rows = [
  { name: 'Café Nord', amount: 120, due: '2026-03-01', paid: true, status: 'open' },
  { name: 'Contoso', amount: 80, due: '2026-03-10', paid: false, status: 'late' },
  { name: 'Fabrikam', amount: null, due: null, paid: null, status: 'open' },
];

describe('filter operators', () => {
  test('text operators are case- and accent-insensitive', () => {
    expect(matchesFilter('Café Nord', { op: 'contains', value: 'cafe' }, col('name'))).toBe(true);
    expect(matchesFilter('Contoso', { op: 'startsWith', value: 'CON' }, col('name'))).toBe(true);
    expect(matchesFilter('Contoso', { op: 'endsWith', value: 'so' }, col('name'))).toBe(true);
    expect(matchesFilter('Contoso', { op: 'equals', value: 'contoso' }, col('name'))).toBe(true);
    expect(matchesFilter('Contoso', { op: 'notContains', value: 'x' }, col('name'))).toBe(true);
    expect(matchesFilter('', { op: 'empty' }, col('name'))).toBe(true);
    expect(matchesFilter('x', { op: 'notEmpty' }, col('name'))).toBe(true);
  });

  test('number operators including between and empties', () => {
    const c = col('amount');
    expect(matchesFilter(120, { op: 'gt', value: 100 }, c)).toBe(true);
    expect(matchesFilter(100, { op: 'gte', value: 100 }, c)).toBe(true);
    expect(matchesFilter(80, { op: 'between', value: 80, value2: 120 }, c)).toBe(true);
    expect(matchesFilter(null, { op: 'gt', value: 0 }, c)).toBe(false);
    expect(matchesFilter(null, { op: 'empty' }, c)).toBe(true);
    expect(matchesFilter(5, { op: 'neq', value: 5 }, c)).toBe(false);
  });

  test('date operators compare whole days', () => {
    const c = col('due');
    expect(matchesFilter('2026-03-01', { op: 'on', value: '2026-03-01' }, c)).toBe(true);
    expect(matchesFilter('2026-03-01T18:30:00Z', { op: 'on', value: '2026-03-01' }, c)).toBe(true);
    expect(matchesFilter('2026-03-10', { op: 'after', value: '2026-03-01' }, c)).toBe(true);
    expect(matchesFilter('2026-03-01', { op: 'before', value: '2026-03-01' }, c)).toBe(false);
    expect(matchesFilter('2026-03-05', { op: 'between', value: '2026-03-01', value2: '2026-03-05' }, c)).toBe(true);
  });

  test('boolean and enum operators', () => {
    expect(matchesFilter(true, { op: 'isTrue' }, col('paid'))).toBe(true);
    expect(matchesFilter(null, { op: 'isFalse' }, col('paid'))).toBe(false);
    expect(matchesFilter('late', { op: 'in', value: ['late'] }, col('status'))).toBe(true);
    expect(matchesFilter('open', { op: 'in', value: [] }, col('status'))).toBe(true);
  });

  test('operatorsFor lists operators with labels for the UI', () => {
    expect(operatorsFor(col('amount')).map((o) => o.id)).toContain('between');
    expect(operatorsFor(col('status')).map((o) => o.id)).toEqual(['in']);
  });
});

describe('filterRows', () => {
  test('ANDs column filters and applies quick search to formatted values', () => {
    const model = { amount: { op: 'gt', value: 50 } };
    expect(filterRows(rows, model, byId).map((r) => r.name)).toEqual(['Café Nord', 'Contoso']);
    expect(filterRows(rows, model, byId, { quickSearch: 'late' }).map((r) => r.name)).toEqual(['Contoso']);
    expect(filterRows(rows, {}, byId, { quickSearch: 'nord 120' }).map((r) => r.name)).toEqual(['Café Nord']);
    expect(filterRows(rows, {}, byId)).toBe(rows);
  });

  test('quick search skips hidden or unsearchable columns when given visible ids', () => {
    expect(filterRows(rows, {}, byId, { quickSearch: 'open', searchColumns: ['name'] })).toEqual([]);
  });

  test('describeFilter gives readable chip text', () => {
    expect(describeFilter({ op: 'gt', value: 100 }, col('amount'), 'en-GB')).toBe('Amount > 100');
    expect(describeFilter({ op: 'between', value: '2026-03-01', value2: '2026-03-05' }, col('due'), 'en-GB')).toBe(
      'Due between 1 Mar 2026 and 5 Mar 2026',
    );
    expect(describeFilter({ op: 'in', value: ['late', 'open'] }, col('status'))).toBe('Status is Late or Open');
    expect(describeFilter({ op: 'empty' }, col('name'))).toBe('Name is empty');
  });
});

describe('one fold for the whole library (B14: the grid adopts the shared fold)', () => {
  test('the engine fold is the primitives fold', async () => {
    const { fold: shared } = await import('@focsd/primitives/internal');

    expect(fold).toBe(shared);
  });

  test('search ignores case and accents, and keeps marks other scripts need', () => {
    expect(fold('CAFÉ')).toBe('cafe');
    expect(fold('फ़्रांस')).toBe('फ़्रांस'.normalize('NFD').toLocaleLowerCase());
  });
});
