import { describe, expect, test } from 'vitest';
import { normalizeColumns } from '../src/engine/columns.js';
import { validateEdit } from '../src/engine/edit.js';
import { sortRows } from '../src/engine/sort.js';
import { sanitizeState } from '../src/engine/state.js';
import { filterRows, describeFilter } from '../src/engine/filter.js';
import { getType } from '../src/engine/types.js';

describe('review fixes (engine)', () => {
  test('C1: numbers parse with the locale separators; ambiguous input is rejected', () => {
    const [n] = normalizeColumns([{ id: 'n', type: 'number' }]);
    expect(validateEdit('1,5', n, {}, 'de-DE')).toEqual({ value: 1.5 });
    expect(validateEdit('1.234,5', n, {}, 'de-DE')).toEqual({ value: 1234.5 });
    expect(validateEdit('1 234,5', n, {}, 'fr-FR')).toEqual({ value: 1234.5 });
    expect(validateEdit('1,234.5', n, {}, 'en-US')).toEqual({ value: 1234.5 });
    expect(validateEdit('1,5,6', n, {}, 'de-DE')).toMatchObject({ error: 'Enter a number.' });
    expect(validateEdit('1.5', n, {}, 'de-DE')).toMatchObject({ error: 'Enter a number.' });
  });

  test('I3: sanitizeState drops filters whose values do not fit the operator or type', () => {
    const columns = normalizeColumns([
      { id: 'status', type: 'enum', options: [{ value: 'sent', label: 'Sent' }] },
      { id: 'amount', type: 'number' },
      { id: 'due', type: 'date' },
    ]);

    const s = sanitizeState(
      {
        filterModel: {
          status: { op: 'in', value: 'sent' },
          amount: { op: 'between', value: 1 },
          due: { op: 'on', value: 'not a date' },
        },
      },
      columns,
    );

    expect(s.filterModel).toEqual({});
    const ok = sanitizeState({ filterModel: { amount: { op: 'gt', value: '5' }, status: { op: 'in', value: ['sent'] } } }, columns);
    expect(ok.filterModel).toEqual({ amount: { op: 'gt', value: 5 }, status: { op: 'in', value: ['sent'] } });
    expect(describeFilter({ op: 'in', value: 'sent' }, columns[0])).toBe('status is Sent');
    expect(() =>
      filterRows([{ status: 'sent' }], { status: { op: 'in', value: 'sent' } }, new Map([['status', columns[0]]])),
    ).not.toThrow();
  });

  test('I5: Date objects format and filter by their local calendar day', () => {
    const tz = process.env.TZ;
    process.env.TZ = 'Asia/Kolkata'; // east of UTC: local midnight is the previous UTC day
    const [d] = normalizeColumns([{ id: 'd', type: 'date' }]);
    const local = new Date(2026, 2, 4, 0, 0);
    expect(getType('date').format(local, d, 'en-GB')).toBe('4 Mar 2026');
    expect(getType('date').operators.on.test(local, '2026-03-04')).toBe(true);
    expect(getType('date').format('2026-03-04', d, 'en-GB')).toBe('4 Mar 2026');
    process.env.TZ = tz;
  });

  test('I6: comparator ties fall through to the next sort key', () => {
    const cols = normalizeColumns([{ id: 'name' }, { id: 'n', type: 'number' }, { id: 'd', type: 'date' }]);
    const byId = new Map(cols.map((c) => [c.id, c]));

    const rows = [
      { name: 'apple', n: 2 },
      { name: 'Apple', n: 1 },
    ];

    expect(
      sortRows(
        rows,
        [
          { colId: 'name', direction: 'asc' },
          { colId: 'n', direction: 'asc' },
        ],
        byId,
      ).map((r) => r.n),
    ).toEqual([1, 2]);

    const dates = [
      { d: new Date(2026, 0, 1, 9), n: 2 },
      { d: new Date(2026, 0, 1, 9), n: 1 },
    ];

    expect(
      sortRows(
        dates,
        [
          { colId: 'd', direction: 'asc' },
          { colId: 'n', direction: 'asc' },
        ],
        byId,
      ).map((r) => r.n),
    ).toEqual([1, 2]);
  });

  test('I7: enum edits accept non-string option values', () => {
    const [e] = normalizeColumns([
      {
        id: 'e',
        type: 'enum',
        options: [
          { value: 1, label: 'One' },
          { value: 2, label: 'Two' },
        ],
      },
    ]);

    expect(validateEdit(2, e, {})).toEqual({ value: 2 });
  });
});
