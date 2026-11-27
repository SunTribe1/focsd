import { describe, expect, it } from 'vitest';
import { place } from '../src/internal/masonry.js';

describe('masonry place', () => {
  it('dom order fills row by row, left to right', () => {
    const r = place([100, 50, 80, 30, 30], 3, 10, 'dom');
    expect(r.items.map((p) => p.column)).toEqual([0, 1, 2, 0, 1]);
    expect(r.items.map((p) => p.top)).toEqual([0, 0, 0, 110, 60]);
    expect(r.height).toBe(140);
  });

  it('balanced puts each item in the shortest column', () => {
    const r = place([100, 50, 80, 30, 30], 3, 10, 'balanced');
    expect(r.items.map((p) => p.column)).toEqual([0, 1, 2, 1, 2]);
    expect(r.items.map((p) => p.top)).toEqual([0, 0, 0, 60, 90]);
    expect(r.height).toBe(120);
  });

  it('one column stacks everything; no items is empty', () => {
    expect(place([10, 20], 1, 5, 'dom').items.map((p) => p.top)).toEqual([0, 15]);
    expect(place([], 3, 10, 'dom')).toEqual({ items: [], height: 0 });
  });
});
