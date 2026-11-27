import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ARRIVAL_DELAY, ArrivalAnnouncer, badgeText, cleanNotifications, isoTime, unreadIds } from '../src/overlays/notification-model.js';

const list = [
  { id: 'a', title: 'Build done', read: false },
  { id: 'b', title: 'Comment', read: true },
  { id: 'c', title: 'Invite' },
];

describe('notification data', () => {
  it('counts unread items (missing read means unread)', () => {
    expect(unreadIds(list)).toEqual(['a', 'c']);
    expect(unreadIds([])).toEqual([]);
  });

  it('drops entries without an id or title and repeated ids, without changing the input', () => {
    const input = [...list, { id: 'a', title: 'Again' }, { id: '', title: 'No id' }, { id: 'd' }, null, 'x'];
    const copy = structuredClone(input);
    const out = cleanNotifications(/** @type {any} */ (input));

    expect(out.map((n) => n.id)).toEqual(['a', 'b', 'c']);
    expect(input).toEqual(copy);
    expect(cleanNotifications(/** @type {any} */ (undefined))).toEqual([]);
  });

  it('turns ids into strings', () => {
    expect(cleanNotifications(/** @type {any} */ ([{ id: 7, title: 'Seven' }]))[0]?.id).toBe('7');
  });

  it('caps the badge text at max, and shows nothing at 0', () => {
    expect(badgeText(0, 99)).toBe('');
    expect(badgeText(5, 99)).toBe('5');
    expect(badgeText(120, 99)).toBe('99+');
    expect(badgeText(12, 9)).toBe('9+');
    expect(badgeText(12, Number.NaN)).toBe('12');
  });

  it('gives an ISO time for a Date, a number or a date string, and "" otherwise', () => {
    const at = '2026-11-25T10:00:00.000Z';

    expect(isoTime(new Date(at))).toBe(at);
    expect(isoTime(Date.parse(at))).toBe(at);
    expect(isoTime(at)).toBe(at);
    expect(isoTime('not a date')).toBe('');
    expect(isoTime(undefined)).toBe('');
  });
});

describe('arrival announcer', () => {
  /** @type {import('vitest').Mock} */
  let say;
  /** @type {ArrivalAnnouncer} */
  let announcer;

  beforeEach(() => {
    vi.useFakeTimers();
    say = vi.fn();
    announcer = new ArrivalAnnouncer(say);
  });

  afterEach(() => {
    announcer.stop();
    vi.useRealTimers();
  });

  it('waits 2 seconds', () => {
    expect(ARRIVAL_DELAY).toBe(2000);
  });

  it('never announces what was there at the start', () => {
    announcer.observe(list);
    announcer.observe(list);
    vi.advanceTimersByTime(5000);

    expect(say).not.toHaveBeenCalled();
  });

  it('treats the first non-empty list as the start, so an async first load is silent', () => {
    announcer.observe([]);
    announcer.observe([]);
    announcer.observe(list);
    vi.advanceTimersByTime(5000);
    expect(say).not.toHaveBeenCalled();

    announcer.observe([...list, { id: 'd', title: 'D' }]);
    vi.advanceTimersByTime(ARRIVAL_DELAY);
    expect(say).toHaveBeenCalledWith(1);
  });

  it('announces 3 rapid arrivals once, with their count', () => {
    announcer.observe(list);
    announcer.observe([...list, { id: 'd', title: 'D' }]);
    vi.advanceTimersByTime(300);
    announcer.observe([...list, { id: 'd', title: 'D' }, { id: 'e', title: 'E' }]);
    announcer.observe([...list, { id: 'd', title: 'D' }, { id: 'e', title: 'E' }, { id: 'f', title: 'F' }]);
    vi.advanceTimersByTime(ARRIVAL_DELAY - 301);

    expect(say).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(say).toHaveBeenCalledTimes(1);
    expect(say).toHaveBeenCalledWith(3);
  });
});

describe('arrival announcer: what it leaves out', () => {
  /** @type {import('vitest').Mock} */
  let say;
  /** @type {ArrivalAnnouncer} */
  let announcer;

  beforeEach(() => {
    vi.useFakeTimers();
    say = vi.fn();
    announcer = new ArrivalAnnouncer(say);
  });

  afterEach(() => {
    announcer.stop();
    vi.useRealTimers();
  });

  it('does not announce read arrivals, re-renders, or items seen before', () => {
    announcer.observe(list);
    announcer.observe([...list, { id: 'r', title: 'Read', read: true }]);
    announcer.observe(list.slice(1));
    announcer.observe(list);
    vi.advanceTimersByTime(5000);

    expect(say).not.toHaveBeenCalled();
  });

  it('starts a new window after a message', () => {
    announcer.observe([{ id: 'w', title: 'W' }]);
    announcer.observe([
      { id: 'w', title: 'W' },
      { id: 'x', title: 'X' },
    ]);
    vi.advanceTimersByTime(ARRIVAL_DELAY);
    announcer.observe([
      { id: 'w', title: 'W' },
      { id: 'x', title: 'X' },
      { id: 'y', title: 'Y' },
    ]);
    vi.advanceTimersByTime(ARRIVAL_DELAY);

    expect(say.mock.calls).toEqual([[1], [1]]);
  });

  it('stop drops a pending message', () => {
    announcer.observe([{ id: 'w', title: 'W' }]);
    announcer.observe([
      { id: 'w', title: 'W' },
      { id: 'x', title: 'X' },
    ]);
    announcer.stop();
    vi.advanceTimersByTime(5000);

    expect(say).not.toHaveBeenCalled();
  });
});

describe('ArrivalAnnouncer with loaded (review item 147)', () => {
  /** @type {import('vitest').Mock} */
  let say;
  /** @type {ArrivalAnnouncer} */
  let announcer;

  beforeEach(() => {
    vi.useFakeTimers();
    say = vi.fn();
    announcer = new ArrivalAnnouncer(say);
  });

  afterEach(() => {
    announcer.stop();
    vi.useRealTimers();
  });

  it('with loaded, announces the first arrival in a list that started empty (review item 147)', () => {
    announcer.observe([], true);
    announcer.observe([{ id: 'n1', title: 'New' }], true);
    vi.advanceTimersByTime(ARRIVAL_DELAY);

    expect(say).toHaveBeenCalledWith(1);
  });

  it('without loaded, an empty list is not a baseline, so the first list is not announced', () => {
    announcer.observe([]);
    announcer.observe([{ id: 'n1', title: 'New' }]);
    vi.advanceTimersByTime(ARRIVAL_DELAY);

    expect(say).not.toHaveBeenCalled();
  });
});
