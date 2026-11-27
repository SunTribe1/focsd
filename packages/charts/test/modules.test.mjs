// The split modules (data, keyboard, describe, shapes, marks registry) are pure: tested without a DOM.
import { describe, expect, it } from 'vitest';
import { firstDrawnPoint, pointValue, resolveRows, resolveSeries } from '../src/data.js';
import { pointName, summarize } from '../src/describe.js';
import { nextPoint } from '../src/keyboard.js';
import { DRAWINGS } from '../src/marks/index.js';
import { MARKERS, PATTERNS, markerPath, seriesColor, shifted } from '../src/shapes.js';

const rows = [
  { label: 'Q1', a: 1, b: 4 },
  { label: 'Q2', a: null, b: 5 },
  { label: 'Q3', a: 3, b: 'x' },
];

describe('data', () => {
  it('resolves series from keys, objects or the first row', () => {
    expect(resolveSeries(['a', { key: 'b', label: 'B' }], rows, 'label')).toEqual([
      { key: 'a', label: 'a' },
      { key: 'b', label: 'B' },
    ]);
    expect(resolveSeries([], rows, 'label').map((s) => s.key)).toEqual(['a', 'b']);
    expect(resolveSeries(undefined, [], 'label')).toEqual([]);
  });

  it('treats non-arrays as no rows', () => {
    expect(resolveRows(null)).toEqual([]);
    expect(resolveRows(rows)).toBe(rows);
  });

  it('draws only finite values, and positive first-series values for donuts', () => {
    const series = resolveSeries([], rows, 'label');

    expect(pointValue({ type: 'bar', series, rows }, 0, 1)).toBeNull();
    expect(pointValue({ type: 'bar', series, rows }, 1, 2)).toBeNull();
    expect(pointValue({ type: 'bar', series, rows }, 1, 1)).toBe(5);
    expect(pointValue({ type: 'donut', series, rows }, 1, 1)).toBeNull();
    expect(pointValue({ type: 'donut', series, rows: [{ a: -2 }] }, 0, 0)).toBeNull();
  });

  it('finds the first drawn point', () => {
    const series = resolveSeries([], rows, 'label');

    expect(firstDrawnPoint('bar', series, rows)).toEqual({ s: 0, r: 0 });
    expect(firstDrawnPoint('bar', series, [{ a: 'x' }])).toBeNull();
    expect(firstDrawnPoint('donut', series, [{ a: null, b: 2 }])).toBeNull();
  });
});

/** A context with just what the pure modules read. */
function context(type = 'bar') {
  const series = resolveSeries([], rows, 'label');
  const valueAt = (s, r) => pointValue({ type, series, rows }, s, r);

  return {
    type,
    rows,
    series,
    valueAt,
    hasPoint: (s, r) => valueAt(s, r) !== null,
    category: (row) => String(row?.label ?? ''),
    number: String,
  };
}

const localize = {
  locale: () => 'en',
  term: (key, ...args) => [key, ...args].join('|'),
};

describe('keyboard', () => {
  const ctx = context();

  it('moves by row and series, skipping gaps, and stays at the edges', () => {
    expect(nextPoint(ctx, { s: 0, r: 0 }, 'ArrowRight')).toEqual([0, 2]);
    expect(nextPoint(ctx, { s: 0, r: 2 }, 'ArrowRight')).toEqual([0, 2]);
    expect(nextPoint(ctx, { s: 0, r: 0 }, 'ArrowDown')).toEqual([1, 0]);
    expect(nextPoint(ctx, { s: 1, r: 0 }, 'ArrowUp')).toEqual([0, 0]);
    expect(nextPoint(ctx, { s: 0, r: 2 }, 'Home')).toEqual([0, 0]);
    expect(nextPoint(ctx, { s: 0, r: 0 }, 'End')).toEqual([0, 2]);
  });

  it('ignores other keys', () => {
    expect(nextPoint(ctx, { s: 0, r: 0 }, 'a')).toBeNull();
  });
});

describe('words', () => {
  it('names points and summarizes the data', () => {
    const ctx = context();

    expect(pointName(ctx, localize, 1, 1)).toBe('b, Q2: 5');
    expect(pointName(ctx, localize, 0, 1)).toBe('a, Q2: noData');
    expect(summarize(ctx, localize)).toBe('chartSummary|barChart|3|2|chartHighest|b, Q2|5');
    expect(summarize({ ...ctx, rows: [] }, localize)).toBe('noData');
  });

  it('adds the share to donut slices', () => {
    const ctx = context('donut');

    expect(pointName(ctx, localize, 0, 0)).toBe('a: 1 (25%)'.replace('a', 'Q1'));
  });
});

describe('shapes and registry', () => {
  it('shifts markers and patterns each lap so series 7 differs from series 1', () => {
    expect(shifted(MARKERS, 0)).not.toBe(shifted(MARKERS, 6));
    expect(shifted(PATTERNS, 0)).toBe('solid');
    expect(seriesColor(6)).toBe(seriesColor(0));
  });

  it('draws every marker as a path', () => {
    for (const m of MARKERS) expect(markerPath(m, 10, 10)).toMatch(/^M/);
  });

  it('has a drawing per type, so new types are one more entry', () => {
    expect(Object.keys(DRAWINGS).toSorted()).toEqual(['area', 'bar', 'donut', 'line', 'scatter']);
  });
});
