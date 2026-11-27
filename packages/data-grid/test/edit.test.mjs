import { describe, expect, test } from 'vitest';
import { normalizeColumns } from '../src/engine/columns.js';
import { applyEdit, validateEdit } from '../src/engine/edit.js';

const [name, amount, status, total] = normalizeColumns([
  { id: 'name', editable: true, required: true },
  {
    id: 'amount',
    type: 'number',
    editable: true,
    min: 0,
    max: 1000,
    validate: (v, row) => (row.locked && v > 10 ? 'Locked rows max out at 10.' : undefined),
  },
  {
    id: 'status',
    type: 'enum',
    editable: true,
    options: [
      { value: 'open', label: 'Open' },
      { value: 'done', label: 'Done' },
    ],
  },
  { id: 'total', type: 'number', valueGetter: (r) => r.amount * 2 },
]);

describe('edit', () => {
  test('parses and validates by type, range, options, required and custom rules', () => {
    expect(validateEdit('  ', name, {})).toMatchObject({ error: 'Enter a value.' });
    expect(validateEdit('Ada', name, {})).toEqual({ value: 'Ada' });
    expect(validateEdit('abc', amount, {})).toMatchObject({ error: 'Enter a number.' });
    expect(validateEdit('-1', amount, {})).toMatchObject({ error: 'Enter 0 or more.' });
    expect(validateEdit('1001', amount, {})).toMatchObject({ error: 'Enter 1000 or less.' });
    expect(validateEdit('11', amount, { locked: true })).toMatchObject({ error: 'Locked rows max out at 10.' });
    expect(validateEdit('done', status, {})).toEqual({ value: 'done' });
    expect(validateEdit('nope', status, {})).toMatchObject({ error: 'Choose one of the options.' });
  });

  test('applyEdit replaces the row immutably', () => {
    const rows = [
      { id: 1, amount: 1 },
      { id: 2, amount: 2 },
    ];

    const out = applyEdit(rows, 2, (r) => r.id, amount, 5);
    expect(out).not.toBe(rows);
    expect(out[1]).toEqual({ id: 2, amount: 5 });
    expect(rows[1].amount).toBe(2);
    expect(out[0]).toBe(rows[0]);
  });

  test('computed columns need a valueSetter', () => {
    expect(() => applyEdit([{ id: 1 }], 1, (r) => r.id, total, 3)).toThrow(/valueSetter/);
  });
});
