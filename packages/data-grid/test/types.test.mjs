import { describe, expect, test } from 'vitest';
import { getType, isEmpty, registerType } from '../src/engine/types.js';

describe('column types', () => {
  test('isEmpty treats null, undefined, empty string and NaN as empty', () => {
    for (const v of [null, undefined, '', Number.NaN]) expect(isEmpty(v)).toBe(true);

    for (const v of [0, false, 'a']) expect(isEmpty(v)).toBe(false);
  });

  test('text compares naturally and case-insensitively', () => {
    const t = getType('text');
    expect(['item 10', 'Item 2', 'item 1'].toSorted(t.compare)).toEqual(['item 1', 'Item 2', 'item 10']);
  });

  test('number formats with the locale and parses user input', () => {
    const t = getType('number');
    expect(t.format(1234.5, {}, 'en-GB')).toBe('1,234.5');
    expect(t.format(0.5, { formatOptions: { style: 'percent' } }, 'en-GB')).toBe('50%');
    expect(t.parse(' 1,234.5 ', {})).toEqual({ value: 1234.5 });
    expect(t.parse('abc', {}).error).toBe('Enter a number.');
    expect(t.parse('', {})).toEqual({ value: null });
  });

  test('date accepts ISO dates and Date objects, formats in UTC, parses YYYY-MM-DD only', () => {
    const t = getType('date');
    expect(t.compare('2026-03-01', new Date(Date.UTC(2026, 1, 28)))).toBeGreaterThan(0);
    expect(t.format('2026-03-14', {}, 'en-GB')).toBe('14 Mar 2026');
    expect(t.parse('2026-02-30', {}).error).toBe('Enter a date as YYYY-MM-DD.');
    expect(t.parse('2026-02-28', {})).toEqual({ value: '2026-02-28' });
  });

  test('boolean formats with labels and orders false before true', () => {
    const t = getType('boolean');
    expect(t.format(true, {})).toBe('Yes');
    expect(t.format(false, { labels: ['Inactive', 'Active'] })).toBe('Inactive');
    expect([true, false].toSorted(t.compare)).toEqual([false, true]);
  });

  test('enum formats labels and sorts by option order', () => {
    const t = getType('enum');

    const col = {
      options: [
        { value: 'low', label: 'Low' },
        { value: 'mid', label: 'Medium' },
        { value: 'high', label: 'High' },
      ],
    };

    expect(t.format('mid', col)).toBe('Medium');
    expect(['high', 'low', 'mid'].toSorted((a, b) => t.compare(a, b, col))).toEqual(['low', 'mid', 'high']);
  });

  test('custom types can be registered', () => {
    registerType('currency', { ...getType('number'), format: (v) => `€${v}` });
    expect(getType('currency').format(3)).toBe('€3');
    expect(() => getType('nope')).toThrow(/Unknown column type/);
  });
});
