import { describe, expect, test } from 'vitest';
import {
  DAY,
  addDays,
  addMonths,
  firstDayOfWeek,
  isoToTime,
  monthWeeks,
  parseISODate,
  startOfWeek,
  toISODate,
  todayUTC,
} from '../src/internal/date.js';

describe('date utils (UTC calendar dates)', () => {
  test('parseISODate accepts real dates only', () => {
    expect(toISODate(parseISODate('2026-03-14'))).toBe('2026-03-14');
    expect(parseISODate('2026-02-30')).toBeNull();
    expect(parseISODate('2026-3-14')).toBeNull();
    expect(parseISODate('')).toBeNull();
    expect(parseISODate('14/03/2026')).toBeNull();
  });

  // 14a-9: Date.UTC maps years 0-99 to 1900-1999; years 1-99 are real dates here.
  test('parseISODate keeps two-digit years as written', () => {
    expect(parseISODate('0050-06-15')?.getUTCFullYear()).toBe(50);
    expect(toISODate(parseISODate('0050-06-15'))).toBe('0050-06-15');
    expect(toISODate(parseISODate('0001-01-01'))).toBe('0001-01-01');
    expect(toISODate(parseISODate('0004-02-29'))).toBe('0004-02-29');
    expect(parseISODate('0003-02-29')).toBeNull();
  });

  test('addDays and addMonths cross month and year edges; months clamp to the last day', () => {
    expect(toISODate(addDays(parseISODate('2026-12-31'), 1))).toBe('2027-01-01');
    expect(toISODate(addDays(parseISODate('2026-03-01'), -1))).toBe('2026-02-28');
    expect(toISODate(addMonths(parseISODate('2026-01-31'), 1))).toBe('2026-02-28');
    expect(toISODate(addMonths(parseISODate('2026-03-14'), -12))).toBe('2025-03-14');
  });

  test('addDays, addMonths, startOfWeek and monthWeeks keep years 0-99 as written', () => {
    const d = parseISODate('0050-01-31');
    expect(toISODate(addDays(d, 1))).toBe('0050-02-01');
    expect(toISODate(addMonths(d, 1))).toBe('0050-02-28');
    expect(toISODate(addMonths(parseISODate('0001-01-15'), -1))).toBe('0000-12-15');
    expect(toISODate(startOfWeek(parseISODate('0050-03-15'), 1)).slice(0, 4)).toBe('0050');
    expect(monthWeeks(50, 2, 1).flat().find(Boolean).getUTCFullYear()).toBe(50);
  });

  test('startOfWeek honours the first day of week (1 = Monday, 7 = Sunday)', () => {
    const sat = parseISODate('2026-03-14');
    expect(toISODate(startOfWeek(sat, 1))).toBe('2026-03-09');
    expect(toISODate(startOfWeek(sat, 7))).toBe('2026-03-08');
  });

  test('monthWeeks pads with null and has 7 days per week', () => {
    const weeks = monthWeeks(2026, 2, 1);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0].slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(toISODate(weeks[0][6])).toBe('2026-03-01');
    const days = weeks.flat().filter(Boolean);
    expect(days).toHaveLength(31);
    expect(toISODate(days.at(-1))).toBe('2026-03-31');
  });

  test('firstDayOfWeek reads locale week info, defaulting to Monday', () => {
    expect(firstDayOfWeek('en-GB')).toBe(1);
    expect([1, 7]).toContain(firstDayOfWeek('en-US'));
    expect(firstDayOfWeek('not a locale!!')).toBe(1);
  });
});

describe('date utils: day constants and today', () => {
  test('DAY is one day in milliseconds', () => {
    expect(DAY).toBe(86_400_000);
    expect(addDays(parseISODate('2026-03-14'), 1).getTime() - parseISODate('2026-03-14').getTime()).toBe(DAY);
  });

  test('todayUTC is the local calendar date at UTC midnight', () => {
    const now = new Date();
    const today = todayUTC();
    expect(today.getUTCFullYear()).toBe(now.getFullYear());
    expect(today.getUTCMonth()).toBe(now.getMonth());
    expect(today.getUTCDate()).toBe(now.getDate());
    expect(today.getTime() % DAY).toBe(0);
  });

  test('isoToTime gives UTC-midnight milliseconds for a real date, NaN otherwise', () => {
    expect(isoToTime('2026-03-14')).toBe(Date.UTC(2026, 2, 14));
    expect(isoToTime('2026-02-30')).toBeNaN();
    expect(isoToTime('')).toBeNaN();
    expect(isoToTime(null)).toBeNaN();
  });
});
