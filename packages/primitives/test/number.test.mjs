import { describe, expect, it } from 'vitest';
import { clamp, finiteOrUndefined } from '../src/internal/number.js';

describe('clamp', () => {
  it('keeps a value inside the range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(42, 0, 10)).toBe(10);
  });

  it('gives max when the range is empty or inverted', () => {
    expect(clamp(5, 3, 3)).toBe(3);
    expect(clamp(5, 8, 2)).toBe(2);
  });
});

describe('finiteOrUndefined', () => {
  it('reads unset and non-numeric values as undefined', () => {
    expect([null, undefined, '', 'x', Number.NaN].map(finiteOrUndefined)).toEqual([undefined, undefined, undefined, undefined, undefined]);
    expect(finiteOrUndefined('4')).toBe(4);
  });
});
