// Wave 18b: stacking, scatter order and words, and mirrored keys. Pure modules, no DOM.
import { describe, expect, it } from 'vitest';
import { firstDrawnPoint, pointValue, resolveSeries, rowsByX } from '../src/data.js';
import { pointName, summarize } from '../src/describe.js';
import { nextPoint } from '../src/keyboard.js';
import { areaPath } from '../src/marks/area.js';
import { stackValues } from '../src/stack.js';

const localize = {
  locale: () => 'en',
  term: (key, ...args) => [key, ...args].join('|'),
};

/** A context with just what the pure modules read. */
function context(type, rows, { x = 'label', stacked = false, mirror = false } = {}) {
  const series = resolveSeries([], rows, x);
  const valueAt = (s, r) => pointValue({ type, series, rows, x }, s, r);

  return {
    type,
    rows,
    series,
    x,
    mirror,
    valueAt,
    hasPoint: (s, r) => valueAt(s, r) !== null,
    category: (row) => String(row?.[x] ?? ''),
    number: String,
    xNumber: (v) => `#${v}`,
    stack: stacked ? stackValues(valueAt, series.length, rows.length) : null,
  };
}

describe('stacking', () => {
  const rows = [
    { label: 'Q1', a: 2, b: 3, c: -1 },
    { label: 'Q2', a: -4, b: null, c: -2 },
  ];

  const ctx = context('bar', rows);
  const stack = stackValues(ctx.valueAt, 3, 2);

  it('stacks positives up from zero and negatives down from zero, separately', () => {
    expect(stack.span(0, 0)).toEqual({ base: 0, top: 2 });
    expect(stack.span(1, 0)).toEqual({ base: 2, top: 5 });
    expect(stack.span(2, 0)).toEqual({ base: 0, top: -1 });
    expect(stack.span(0, 1)).toEqual({ base: 0, top: -4 });
    expect(stack.span(2, 1)).toEqual({ base: -4, top: -6 });
  });

  it('skips missing values, totals each row and reports the stacked extent', () => {
    expect(stack.span(1, 1)).toBeNull();
    expect(stack.totals).toEqual([4, -6]);
    expect([stack.min, stack.max]).toEqual([-6, 5]);
  });

  it('names segments with their total and summarizes the highest total', () => {
    const stacked = context('bar', rows, { stacked: true });

    expect(pointName(stacked, localize, 1, 0)).toBe('b, Q1: chartOfTotal|3|4');
    expect(summarize(stacked, localize)).toBe('chartSummary|stackedBarChart|2|3|chartHighestTotal|Q1|4');
    expect(summarize(context('area', rows, { stacked: true }), localize)).toContain('stackedAreaChart');
    expect(summarize(context('area', rows), localize)).toContain('areaChart|2|3|chartHighest|');
  });
});

describe('scatter', () => {
  const rows = [
    { t: 30, a: 5, b: 1 },
    { t: 10, a: 9, b: null },
    { t: 'x', a: 7, b: 2 },
    { t: 20, a: 3, b: 4 },
  ];

  const ctx = context('scatter', rows, { x: 't' });

  it('draws only points with a finite x and y', () => {
    expect(ctx.valueAt(0, 2)).toBeNull();
    expect(ctx.valueAt(1, 1)).toBeNull();
    expect(ctx.valueAt(0, 0)).toBe(5);
  });

  it('orders points by x, and starts at the smallest x of the first series', () => {
    expect(rowsByX(ctx, 0)).toEqual([1, 3, 0]);
    expect(firstDrawnPoint('scatter', ctx.series, rows, 't')).toEqual({ s: 0, r: 1 });
  });

  it('moves by x within a series, to the nearest x across series, and to the ends', () => {
    expect(nextPoint(ctx, { s: 0, r: 1 }, 'ArrowRight')).toEqual([0, 3]);
    expect(nextPoint(ctx, { s: 0, r: 0 }, 'ArrowRight')).toEqual([0, 0]);
    expect(nextPoint(ctx, { s: 0, r: 3 }, 'ArrowLeft')).toEqual([0, 1]);
    expect(nextPoint(ctx, { s: 0, r: 1 }, 'ArrowDown')).toEqual([1, 3]);
    expect(nextPoint(ctx, { s: 1, r: 0 }, 'ArrowUp')).toEqual([0, 0]);
    expect(nextPoint(ctx, { s: 1, r: 0 }, 'ArrowDown')).toEqual([1, 0]);
    expect(nextPoint(ctx, { s: 0, r: 3 }, 'Home')).toEqual([0, 1]);
    expect(nextPoint(ctx, { s: 0, r: 1 }, 'End')).toEqual([0, 0]);
  });

  it('names points by x and y, and summarizes the ranges', () => {
    expect(pointName(ctx, localize, 0, 3)).toBe('a, scatterPoint|#20|3');
    expect(summarize(ctx, localize)).toBe('scatterSummary|scatterChart|2|5|scatterRanges|chartRange|#10|#30|chartRange|1|9');
    expect(summarize(context('scatter', [{ t: 'x', a: 1 }], { x: 't' }), localize)).toBe('noData');
  });
});

describe('mirror', () => {
  const rows = [
    { label: 'Q1', a: 1 },
    { label: 'Q2', a: 2 },
  ];

  it('swaps Left and Right so they follow the drawing', () => {
    const ctx = context('bar', rows, { mirror: true });

    expect(nextPoint(ctx, { s: 0, r: 0 }, 'ArrowLeft')).toEqual([0, 1]);
    expect(nextPoint(ctx, { s: 0, r: 1 }, 'ArrowRight')).toEqual([0, 0]);
    expect(nextPoint(ctx, { s: 0, r: 1 }, 'Home')).toEqual([0, 0]);
    expect(nextPoint(context('bar', rows), { s: 0, r: 0 }, 'ArrowRight')).toEqual([0, 1]);
  });
});

describe('area shape', () => {
  it('closes each run of values down to its base, and breaks at gaps', () => {
    const p = (x, y, base = 100) => ({ x, y, r: x, base });

    expect(areaPath([p(0, 10), p(10, 20), null, p(30, 5)])).toBe('M0.0 10.0L10.0 20.0L10.0 100.0L0.0 100.0ZM30.0 5.0L30.0 100.0Z');
    expect(areaPath([null])).toBe('');
  });
});
