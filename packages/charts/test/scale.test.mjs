import { describe, expect, it } from 'vitest';
import { arcPath, linear, niceStep, niceTicks } from '../src/scale.js';

describe('niceTicks', () => {
  it('covers the data with round steps and includes zero', () => {
    expect(niceTicks(0, 87)).toEqual({ min: 0, max: 100, ticks: [0, 20, 40, 60, 80, 100] });
    expect(niceTicks(-12, 30)).toEqual({ min: -20, max: 30, ticks: [-20, -10, 0, 10, 20, 30] });
    expect(niceTicks(1200, 4800).ticks[0]).toBe(0);
  });
  it('handles a flat series', () => {
    expect(niceTicks(0, 0)).toEqual({ min: 0, max: 1, ticks: [0, 1] });
  });
});

it('niceStep picks 1, 2 or 5 times a power of ten', () => {
  expect([niceStep(10), niceStep(87), niceStep(4800), niceStep(0.3)]).toEqual([2, 20, 1000, 0.1]);
});

it('linear maps a domain onto a range', () => {
  const y = linear(0, 100, 200, 0);
  expect([y(0), y(50), y(100)]).toEqual([200, 100, 0]);
});

it('arcPath draws a closed donut slice, and never a degenerate full circle', () => {
  expect(arcPath(50, 50, 40, 24, 0, Math.PI / 2)).toMatch(
    /^M50\.00 10\.00A40 40 0 0 1 90\.00 50\.00L74\.00 50\.00A24 24 0 0 0 50\.00 26\.00Z$/,
  );
  expect(arcPath(50, 50, 40, 24, 0, Math.PI * 2)).toContain('A40 40 0 1 1');
});

describe('niceTicks without zero (scatter axes)', () => {
  it('covers only the data, with round steps', () => {
    expect(niceTicks(1, 40, 5, false)).toEqual({ min: 0, max: 40, ticks: [0, 10, 20, 30, 40] });
    expect(niceTicks(3, 97, 5, false)).toEqual({ min: 0, max: 100, ticks: [0, 20, 40, 60, 80, 100] });
    expect(niceTicks(1020, 1090, 5, false)).toEqual({ min: 1020, max: 1100, ticks: [1020, 1040, 1060, 1080, 1100] });
    expect(niceTicks(-80, -20, 5, false).max).toBe(-20);
  });

  it('widens a single value and survives no values', () => {
    const one = niceTicks(5, 5, 5, false);

    expect(one.min).toBeLessThan(5);
    expect(one.max).toBeGreaterThan(5);
    expect(niceTicks(Infinity, -Infinity, 5, false)).toEqual({ min: 0, max: 1, ticks: [0, 1] });
  });
});
