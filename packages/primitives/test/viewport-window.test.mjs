import { describe, expect, it } from 'vitest';
import { ViewportWindow } from '../src/internal/viewport-window.js';

describe('ViewportWindow', () => {
  it('fixed heights: range, total and offsets', () => {
    const w = new ViewportWindow({ count: 100_000, itemHeight: 32, overscan: 5 });
    expect(w.range(0, 320)).toEqual({ first: 0, last: 14, offset: 0, total: 3_200_000 });
    expect(w.range(32_000, 320)).toMatchObject({ first: 995, last: 1014, offset: 995 * 32 });
    expect(w.range(3_200_000, 320).last).toBe(99_999);
  });

  it('variable heights: estimates until measured, then exact', () => {
    const w = new ViewportWindow({ count: 1000, estimate: 40, overscan: 0 });
    expect(w.offsetOf(10)).toBe(400);
    w.measure(0, 100);
    expect(w.offsetOf(10)).toBe(460);
    expect(w.indexAt(459)).toBe(9);
    expect(w.indexAt(460)).toBe(10);
    expect(w.range(0, 1).total).toBe(1000 * 40 + 60);
  });

  it('measure returns how much a row grew, for scroll anchoring', () => {
    const w = new ViewportWindow({ count: 100, estimate: 40 });
    expect(w.measure(2, 140)).toBe(100);
    expect(w.measure(2, 140)).toBe(0);
  });

  it('scrollTopFor aligns, and only scrolls when needed for nearest', () => {
    const w = new ViewportWindow({ count: 100, itemHeight: 50 });
    expect(w.scrollTopFor(10, 200, 'start', 0)).toBe(500);
    expect(w.scrollTopFor(10, 200, 'end', 0)).toBe(350);
    expect(w.scrollTopFor(10, 200, 'center', 0)).toBe(425);
    expect(w.scrollTopFor(2, 200, 'nearest', 50)).toBe(50);
    expect(w.scrollTopFor(0, 200, 'nearest', 50)).toBe(0);
    expect(w.scrollTopFor(99, 200, 'start', 0)).toBe(4800);
  });

  it('handles count changes, keeping measured rows, and an empty list', () => {
    const w = new ViewportWindow({ count: 0, itemHeight: 20 });
    expect(w.range(0, 100)).toEqual({ first: 0, last: -1, offset: 0, total: 0 });
    w.setCount(3);
    expect(w.range(0, 100).last).toBe(2);
    const v = new ViewportWindow({ count: 3, estimate: 10 });
    v.measure(1, 50);
    v.setCount(5);
    expect(v.offsetOf(2)).toBe(60);
    expect(v.range(0, 1).total).toBe(90);
  });

  it('answers quickly for a million rows', () => {
    const w = new ViewportWindow({ count: 1_000_000, estimate: 30 });
    const t = performance.now();

    for (let i = 0; i < 10_000; i += 1) w.range(i * 2_999, 800);
    expect(performance.now() - t).toBeLessThan(200);
  });
});
