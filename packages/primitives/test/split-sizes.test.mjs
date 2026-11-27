import { describe, expect, it } from 'vitest';
import { collapse, expand, normalize, resize } from '../src/internal/split-sizes.js';

/** Element-wise toBeCloseTo, for sizes that went through floating-point sharing. */
const expectClose = (actual, expected) => {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((size, i) => expect(size).toBeCloseTo(expected[i], 9));
};

describe('split sizes', () => {
  it('normalizes to 100 and fills the gaps', () => {
    expect(normalize([20, undefined, undefined], [0, 0, 0], [100, 100, 100])).toEqual([20, 40, 40]);
    expect(normalize([50, 50, 50], [0, 0, 0], [100, 100, 100]).reduce((a, b) => a + b)).toBeCloseTo(100);
  });
  it('moves one boundary within both limits', () => {
    expect(resize([30, 40, 30], 0, 10, [10, 20, 10], [80, 80, 80])).toEqual([40, 30, 30]);
    expect(resize([30, 40, 30], 0, 30, [10, 20, 10], [80, 80, 80])).toEqual([50, 20, 30]);
    expect(resize([30, 40, 30], 1, -50, [10, 20, 10], [80, 80, 80])).toEqual([30, 20, 50]);
  });
  it('collapses a pane and restores it', () => {
    const { sizes, restore } = collapse([30, 40, 30], 2, [10, 20, 0]);
    expect(sizes).toEqual([30, 70, 0]);
    expect(expand(sizes, 2, restore, [10, 20, 0], [80, 80, 80])).toEqual([30, 40, 30]);
  });
  it('shares everything equally when nothing is set, and keeps limits', () => {
    expect(normalize([undefined, undefined], [0, 0], [100, 100])).toEqual([50, 50]);
    expect(normalize([0, 0], [0, 0], [100, 100])).toEqual([50, 50]);
    expectClose(normalize([90, undefined], [0, 20], [100, 100]), [80, 20]);
  });
  it('does not shrink a pane already below its minimum, and keeps maximums', () => {
    expect(resize([0, 100], 0, -5, [15, 0], [100, 100])).toEqual([0, 100]);
    expect(resize([40, 60], 0, 50, [0, 0], [70, 100])).toEqual([70, 30]);
    expect(resize([40, 60], 0, 5, [0, 0], [100, 100])).toEqual([45, 55]);
  });
  it('collapses the first pane into the next and takes space from farther panes when needed', () => {
    const { sizes, restore } = collapse([30, 40, 30], 0, [0, 0, 0]);
    expect(sizes).toEqual([0, 70, 30]);
    expect(restore).toBe(30);
    expect(expand([0, 25, 75], 0, 30, [0, 20, 10], [100, 100, 100])).toEqual([30, 20, 50]);
    expect(expand([0, 50, 50], 0, 90, [0, 0, 0], [40, 100, 100])).toEqual([40, 10, 50]);
    expect(expand([0, 100], 0, 30, [0, 0], [100, 100])).toEqual([30, 70]);
  });
});

describe('split sizes: limits, collapse and rounding (review round 1)', () => {
  it('keeps every limit after scaling, handing the difference to the panes that can take it', () => {
    expectClose(normalize([10, 10, 10], [0, 0, 0], [50, 100, 100]), [100 / 3, 100 / 3, 100 / 3]);
    expectClose(normalize([80, 80, 80], [0, 0, 0], [20, 100, 100]), [20, 40, 40]);
    expectClose(normalize([1, 1, 98], [30, 30, 0], [100, 100, 100]), [30, 30, 40]);
    const fitted = normalize([5, 60, 60, 5], [10, 0, 0, 25], [100, 30, 100, 100]);
    expect(fitted.reduce((a, b) => a + b)).toBeCloseTo(100, 9);
    fitted.forEach((size, i) => {
      expect(size).toBeGreaterThanOrEqual([10, 0, 0, 25][i] - 1e-9);
      expect(size).toBeLessThanOrEqual([100, 30, 100, 100][i] + 1e-9);
    });
  });
  it('scales the minimums (or maximums) to 100 when the limits cannot all hold', () => {
    expectClose(normalize([50, 50], [60, 90], [100, 100]), [40, 60]);
    expectClose(normalize([50, 50], [0, 0], [20, 30]), [40, 60]);
    expect(normalize([undefined], [0], [0])).toEqual([100]);
  });
  it('keeps the total at 100 through a chain of resizes', () => {
    const mins = [10, 5, 20, 0];
    const maxes = [60, 100, 70, 40];
    let sizes = normalize([25, undefined, 30, undefined], mins, maxes);

    for (const [index, delta] of [
      [0, 17],
      [1, -33],
      [2, 50],
      [0, -80],
      [1, 12.5],
      [2, -7],
    ]) {
      sizes = resize(sizes, index, delta, mins, maxes);
      expect(sizes.reduce((a, b) => a + b)).toBeCloseTo(100, 9);
    }
  });
  it('a collapsed pane that grows starts at its minimum', () => {
    expect(resize([50, 0, 50], 0, -1, [0, 20, 0], [100, 100, 100])).toEqual([30, 20, 50]);
    expect(resize([50, 0, 50], 1, 1, [0, 20, 0], [100, 100, 100])).toEqual([50, 20, 30]);
  });
  it('a collapse keeps the neighbor within its maximum and spills the rest further', () => {
    expect(collapse([30, 40, 30], 2, [0, 0, 0], [100, 50, 100])).toEqual({ sizes: [50, 50, 0], restore: 30 });
    expect(collapse([100], 0, [0], [100])).toEqual({ sizes: [100], restore: 0 });
    expect(collapse([40, 60], 0, [0, 0], [100, 80])).toEqual({ sizes: [40, 60], restore: 0 });
  });
});
