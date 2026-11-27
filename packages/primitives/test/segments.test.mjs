import { describe, expect, it } from 'vitest';
import { stepSegment, swallowEditKey, typeDigit } from '../src/internal/segments.js';

describe('stepSegment', () => {
  it('wraps and starts from the edges when empty', () => {
    expect(stepSegment(23, 1, 0, 23)).toBe(0);
    expect(stepSegment(1, -1, 1, 12)).toBe(12);
    expect(stepSegment(null, 1, 1, 31)).toBe(1);
    expect(stepSegment(null, -1, 1, 31)).toBe(31);
  });
  it('wraps deltas larger than one', () => {
    expect(stepSegment(50, 15, 0, 59)).toBe(5);
    expect(stepSegment(1, -3, 1, 12)).toBe(10);
  });
});

describe('typeDigit', () => {
  const hour = { min: 0, max: 23, length: 2 };
  const day = { min: 1, max: 31, length: 2 };
  const month = { min: 1, max: 12, length: 2 };
  const year = { min: 1, max: 9999, length: 4 };
  it('buffers a digit that could continue, finishes one that cannot', () => {
    expect(typeDigit('', 2, hour)).toEqual({ value: 2, buffer: '2', advance: false });
    expect(typeDigit('', 5, hour)).toEqual({ value: 5, buffer: '', advance: true });
    expect(typeDigit('', 4, day)).toEqual({ value: 4, buffer: '', advance: true });
    expect(typeDigit('', 0, month)).toEqual({ value: null, buffer: '0', advance: false });
  });
  it('completes two digits, or carries the digit that does not fit', () => {
    expect(typeDigit('2', 3, hour)).toEqual({ value: 23, buffer: '', advance: true });
    expect(typeDigit('2', 5, hour)).toEqual({ value: 2, buffer: '', advance: true, carry: 5 });
    expect(typeDigit('0', 9, month)).toEqual({ value: 9, buffer: '', advance: true });
    expect(typeDigit('3', 2, day)).toEqual({ value: 3, buffer: '', advance: true, carry: 2 });
  });
  it('takes four digits for a year', () => {
    let s = typeDigit('', 2, year);

    for (const d of [0, 2]) s = typeDigit(s.buffer, d, year);
    expect(s).toEqual({ value: 202, buffer: '202', advance: false });
    expect(typeDigit(s.buffer, 6, year)).toEqual({ value: 2026, buffer: '', advance: true });
  });
  it('treats a full-length value below min as final and empty, carrying the digit', () => {
    expect(typeDigit('0', 0, month)).toEqual({ value: null, buffer: '', advance: true, carry: 0 });
  });
  it('buffers zeros into a year, then carries the fourth', () => {
    expect(typeDigit('', 0, year)).toEqual({ value: null, buffer: '0', advance: false });
    expect(typeDigit('0', 0, year)).toEqual({ value: null, buffer: '00', advance: false });
    expect(typeDigit('00', 0, year)).toEqual({ value: null, buffer: '000', advance: false });
    expect(typeDigit('000', 0, year)).toEqual({ value: null, buffer: '', advance: true, carry: 0 });
  });
  it('finishes a one-digit segment at once, empty when below min', () => {
    expect(typeDigit('', 0, { min: 1, max: 9, length: 1 })).toEqual({ value: null, buffer: '', advance: true });
    expect(typeDigit('', 7, { min: 1, max: 9, length: 1 })).toEqual({ value: 7, buffer: '', advance: true });
  });
  it('types minutes: 0-5 wait for a second digit, 6-9 finish', () => {
    const minute = { min: 0, max: 59, length: 2 };

    expect(typeDigit('', 5, minute)).toEqual({ value: 5, buffer: '5', advance: false });
    expect(typeDigit('5', 9, minute)).toEqual({ value: 59, buffer: '', advance: true });
    expect(typeDigit('', 6, minute)).toEqual({ value: 6, buffer: '', advance: true });
    expect(typeDigit('0', 0, minute)).toEqual({ value: 0, buffer: '', advance: true });
  });
});

describe('swallowEditKey', () => {
  /** A keydown stand-in that records preventDefault. */
  const press = (key, mods = {}) => {
    const event = { key, ctrlKey: false, metaKey: false, altKey: false, ...mods, prevented: false };

    return Object.assign(event, { preventDefault: () => (event.prevented = true) });
  };

  it('swallows the keys a segment acts on', () => {
    for (const key of ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', 'Backspace', 'Delete', '0', '9']) {
      const event = press(key);
      swallowEditKey(event);
      expect(event.prevented, key).toBe(true);
    }
  });
  it('lets Escape, Tab, arrows across segments and shortcuts through', () => {
    for (const event of [
      press('Escape'),
      press('Tab'),
      press('ArrowLeft'),
      press('ArrowRight'),
      press('a'),
      press('5', { ctrlKey: true }),
      press('Home', { metaKey: true }),
      press('1', { altKey: true }),
    ]) {
      swallowEditKey(event);
      expect(event.prevented, event.key).toBe(false);
    }
  });
  it('takes a normalized key and extra letters', () => {
    const arabic = press('\u0663');
    swallowEditKey(arabic, '3');
    expect(arabic.prevented).toBe(true);
    const period = press('P');
    swallowEditKey(period, period.key, 'apAP');
    expect(period.prevented).toBe(true);
  });
});
