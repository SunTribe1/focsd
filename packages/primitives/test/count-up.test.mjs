import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  easeOut,
  formatIntl,
  fractionDigits,
  frameValue,
  intlOptions,
  parseDuration,
  prefersReducedMotion,
} from '../src/internal/count-up.js';

afterEach(() => vi.restoreAllMocks());

describe('easeOut', () => {
  it('starts at 0, ends at 1 and slows towards the end', () => {
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBe(1);
    expect(easeOut(0.5)).toBeGreaterThan(0.5);
  });
});

describe('fractionDigits', () => {
  it('is the most decimals among the numbers, capped at 6', () => {
    expect(fractionDigits(0, 1200)).toBe(0);
    expect(fractionDigits(1.5, 2.25)).toBe(2);
    expect(fractionDigits(0.1 + 0.2)).toBe(6);
    expect(fractionDigits(1e21)).toBe(0);
  });
});

describe('frameValue', () => {
  it('moves from start to end and rounds to their precision', () => {
    expect(frameValue(0, 100, 0)).toBe(0);
    expect(frameValue(0, 100, 1)).toBe(100);
    expect(Number.isInteger(frameValue(0, 100, 0.37))).toBe(true);
    expect(frameValue(1.5, 2.5, 1)).toBe(2.5);
  });

  it('counts down as well as up', () => {
    const mid = frameValue(100, 0, 0.5);

    expect(mid).toBeLessThan(100);
    expect(mid).toBeGreaterThan(0);
  });
});

describe('parseDuration', () => {
  it('reads milliseconds and seconds, and falls back for anything else', () => {
    expect(parseDuration('240ms', 1)).toBe(240);
    expect(parseDuration(' 0.3s ', 1)).toBe(300);
    expect(parseDuration('0ms', 1)).toBe(0);
    expect(parseDuration('', 240)).toBe(240);
    expect(parseDuration('fast', 240)).toBe(240);
  });
});

describe('prefersReducedMotion', () => {
  it('is false without matchMedia (the server) and follows the media query otherwise', () => {
    expect(prefersReducedMotion()).toBe(false);
    vi.stubGlobal('matchMedia', (/** @type {string} */ q) => ({ matches: q === '(prefers-reduced-motion: reduce)' }));
    expect(prefersReducedMotion()).toBe(true);
    vi.unstubAllGlobals();
  });
});

describe('intlOptions', () => {
  it('reads a JSON object attribute and ignores anything else, warning once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(intlOptions.fromAttribute('{"style":"percent"}')).toEqual({ style: 'percent' });
    expect(intlOptions.fromAttribute(null)).toBeUndefined();
    expect(intlOptions.fromAttribute('')).toBeUndefined();
    expect(intlOptions.fromAttribute('{bad')).toBeUndefined();
    expect(intlOptions.fromAttribute('[1]')).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe('formatIntl', () => {
  it('formats with Intl options for a locale', () => {
    expect(formatIntl(1234.5, { style: 'currency', currency: 'USD' }, 'en')).toBe('$1,234.50');
    expect(formatIntl(0.12, { style: 'percent' }, 'en')).toBe('12%');
    expect(formatIntl(1234, undefined, 'de')).toBe('1.234');
  });

  it('falls back to plain numbers when Intl rejects the options, warning once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(formatIntl(5, { style: 'currency' }, 'en')).toBe('5');
    expect(formatIntl(6, { style: 'currency' }, 'en')).toBe('6');
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
