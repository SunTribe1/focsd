import { afterEach, describe, expect, it, vi } from 'vitest';
import { intervalFor, pickUnit, subscribe } from '../src/internal/relative-clock.js';

describe('pickUnit', () => {
  it('picks the largest whole unit', () => {
    expect(pickUnit(-3 * 60_000)).toEqual({ value: -3, unit: 'minute' });
    expect(pickUnit(-59_000)).toEqual({ value: -59, unit: 'second' });
    expect(pickUnit(2 * 3_600_000 + 5)).toEqual({ value: 2, unit: 'hour' });
    expect(pickUnit(-10 * 86_400_000)).toEqual({ value: -1, unit: 'week' });
  });

  it('rounds to the nearest whole unit, so a page that took a moment to load still reads "in 3 minutes"', () => {
    expect(pickUnit(3 * 60_000 - 1_500)).toEqual({ value: 3, unit: 'minute' });
    expect(pickUnit(59_600)).toEqual({ value: 1, unit: 'minute' });
    expect(pickUnit(-200)).toEqual({ value: 0, unit: 'second' });
    expect(Object.is(pickUnit(-200).value, 0)).toBe(true);
  });

  it('steps through days, weeks, months and years', () => {
    const day = 86_400_000;

    expect(pickUnit(-day)).toEqual({ value: -1, unit: 'day' });
    expect(pickUnit(6 * day)).toEqual({ value: 6, unit: 'day' });
    expect(pickUnit(29 * day)).toEqual({ value: 4, unit: 'week' });
    expect(pickUnit(-45 * day)).toEqual({ value: -2, unit: 'month' });
    expect(pickUnit(400 * day)).toEqual({ value: 1, unit: 'year' });
  });
});

describe('intervalFor', () => {
  it('asks for minute ticks under 2 hours, so the hour-to-minute handover is on time', () => {
    expect(intervalFor(1.5 * 3_600_000)).toBe(60_000);
    expect(intervalFor(-1.5 * 3_600_000)).toBe(60_000);
    expect(intervalFor(-30_000)).toBe(60_000);
    expect(intervalFor(2 * 3_600_000)).toBe(3_600_000);
    expect(intervalFor(-3 * 86_400_000)).toBe(3_600_000);
    expect(intervalFor(Number.NaN)).toBe(3_600_000);
  });
});

describe('subscribe', () => {
  afterEach(() => vi.useRealTimers());
  it('shares one timer and pauses while hidden', () => {
    vi.useFakeTimers();
    const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' });
    const a = vi.fn();
    const b = vi.fn();
    const offA = subscribe(a, () => 60_000, doc);
    const offB = subscribe(b, () => 3_600_000, doc);
    vi.advanceTimersByTime(60_000);
    expect([a.mock.calls.length, b.mock.calls.length]).toEqual([1, 1]);
    doc.visibilityState = 'hidden';
    doc.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(600_000);
    expect(a.mock.calls.length).toBe(1);
    doc.visibilityState = 'visible';
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(a.mock.calls.length).toBe(2);
    offA();
    vi.advanceTimersByTime(3_600_000);
    expect(a.mock.calls.length).toBe(2);
    expect(vi.getTimerCount()).toBe(1);
    offB();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('subscribe: joining and leaving', () => {
  afterEach(() => vi.useRealTimers());

  it('stops the timer when the last subscriber leaves', () => {
    vi.useFakeTimers();
    const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' });
    const a = vi.fn();
    const off = subscribe(a, () => 60_000, doc);

    off();
    off();
    expect(vi.getTimerCount()).toBe(0);
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(a).not.toHaveBeenCalled();
  });

  it('waits for the document to become visible before ticking', () => {
    vi.useFakeTimers();
    const doc = Object.assign(new EventTarget(), { visibilityState: 'hidden' });
    const a = vi.fn();
    const off = subscribe(a, () => 60_000, doc);

    vi.advanceTimersByTime(120_000);
    expect(a).not.toHaveBeenCalled();
    doc.visibilityState = 'visible';
    doc.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(60_000);
    expect(a).toHaveBeenCalledTimes(2);
    off();
  });
});

describe('subscribe: intervals', () => {
  afterEach(() => vi.useRealTimers());

  it('ticks sooner when a subscriber that needs minutes joins an hourly clock', () => {
    vi.useFakeTimers();
    const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' });
    const hourly = vi.fn();
    const minutely = vi.fn();
    const offHourly = subscribe(hourly, () => 3_600_000, doc);

    vi.advanceTimersByTime(30_000);
    const offMinutely = subscribe(minutely, () => 60_000, doc);

    vi.advanceTimersByTime(60_000);
    expect(minutely).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);
    offHourly();
    offMinutely();
  });

  it('moves to the hourly interval once no subscriber needs minutes', () => {
    vi.useFakeTimers();
    const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' });
    let interval = 60_000;
    const a = vi.fn();
    const off = subscribe(a, () => interval, doc);

    vi.advanceTimersByTime(60_000);
    interval = 3_600_000;
    vi.advanceTimersByTime(60_000);
    expect(a).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(3_000_000);
    expect(a).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(660_000);
    expect(a).toHaveBeenCalledTimes(3);
    off();
  });
});

describe('subscribe: a subscriber that throws', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('reports the error and keeps ticking the others', () => {
    vi.useFakeTimers();
    const reportError = vi.fn();

    vi.stubGlobal('reportError', reportError);

    const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' });
    const failure = new Error('render failed');

    const offBad = subscribe(
      () => {
        throw failure;
      },
      () => 60_000,
      doc,
    );

    const good = vi.fn();
    const offGood = subscribe(good, () => 60_000, doc);

    vi.advanceTimersByTime(120_000);
    expect(good).toHaveBeenCalledTimes(2);
    expect(reportError).toHaveBeenCalledTimes(2);
    expect(reportError).toHaveBeenCalledWith(failure);
    offBad();
    offGood();
  });

  it('falls back to console.error without reportError', () => {
    vi.useFakeTimers();
    vi.stubGlobal('reportError', undefined);

    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' });

    const off = subscribe(
      () => {
        throw new Error('render failed');
      },
      () => 60_000,
      doc,
    );

    vi.advanceTimersByTime(60_000);
    expect(error).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);
    off();
    error.mockRestore();
  });
});
