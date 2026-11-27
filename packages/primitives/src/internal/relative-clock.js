/**
 * The shared clock behind `focsd-relative-time` (private: bases import it by relative path).
 * `pickUnit` turns a time difference into a value and unit for `Intl.RelativeTimeFormat`;
 * `subscribe` runs one timer for every subscriber, paused while the document is hidden.
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Each unit, its length, and the rounded value it stays under before the next unit takes over.
 * Weeks run until they round to 5 (about a month), months until 12 (a month is 30 days, a year 365 days).
 * @type {ReadonlyArray<{ unit: Intl.RelativeTimeFormatUnit, ms: number, below: number }>}
 */
const UNITS = [
  { unit: 'second', ms: SECOND, below: 60 },
  { unit: 'minute', ms: MINUTE, below: 60 },
  { unit: 'hour', ms: HOUR, below: 24 },
  { unit: 'day', ms: DAY, below: 7 },
  { unit: 'week', ms: 7 * DAY, below: 5 },
  { unit: 'month', ms: 30 * DAY, below: 12 },
];

const YEAR = 365 * DAY;

/**
 * Round half away from zero, so the past and the future round alike; never returns -0.
 * @param {number} value
 */
const roundAway = (value) => Math.sign(value) * Math.round(Math.abs(value)) + 0;

/**
 * The largest unit that fits a time difference, and the whole number of it (rounded to the nearest, halves away from zero).
 * Negative differences are in the past.
 * @param {number} diffMs The time minus now, in milliseconds.
 * @returns {{ value: number, unit: Intl.RelativeTimeFormatUnit }}
 */
export function pickUnit(diffMs) {
  for (const { unit, ms, below } of UNITS) {
    const value = roundAway(diffMs / ms);

    if (Math.abs(value) < below) return { value, unit };
  }

  return { value: roundAway(diffMs / YEAR), unit: 'year' };
}

/**
 * How often text for this time difference can change: each minute under 2 hours (so the switch from
 * "1 hour" to "59 minutes" is on time), else each hour.
 * @param {number} diffMs The time minus now, in milliseconds.
 * @returns {number} Milliseconds.
 */
export function intervalFor(diffMs) {
  return Math.abs(diffMs) < 2 * HOUR ? MINUTE : HOUR;
}

/**
 * @typedef {object} ClockDocument The part of `Document` the clock reads.
 * @property {DocumentVisibilityState | string} visibilityState
 * @property {EventTarget['addEventListener']} addEventListener
 * @property {EventTarget['removeEventListener']} removeEventListener
 */

/** @type {Map<() => void, () => number>} Each callback and the interval it asks for. */
const subscribers = new Map();

/** @type {ReturnType<typeof setTimeout> | undefined} */
let timer;

/** The interval the running timer was set with. */
let scheduled = Infinity;

/** @type {ClockDocument | undefined} */
let watched;

function stop() {
  clearTimeout(timer);
  timer = undefined;
  scheduled = Infinity;
}

/** The smallest interval any subscriber asks for. */
function interval() {
  return Math.min(...[...subscribers.values()].map((ask) => ask()));
}

function schedule() {
  stop();

  if (subscribers.size === 0 || watched?.visibilityState === 'hidden') return;
  scheduled = interval();
  timer = setTimeout(tick, scheduled);
}

/** @param {unknown} error */
function report(error) {
  if (globalThis.reportError) globalThis.reportError(error);
  else console.error(error);
}

/** Schedules the next tick first, so a subscriber that throws cannot stop the clock. */
function tick() {
  schedule();

  for (const callback of subscribers.keys()) {
    try {
      callback();
    } catch (error) {
      report(error);
    }
  }
}

function onVisibility() {
  if (watched?.visibilityState === 'hidden') stop();
  else tick();
}

/**
 * Call `callback` on a timer shared by every subscriber. The timer runs at the smallest interval
 * any subscriber asks for (asked again after each tick), pauses while `doc` is hidden and ticks
 * once when it becomes visible again.
 * @param {() => void} callback
 * @param {() => number} intervalMs The interval this subscriber needs now, in milliseconds.
 * @param {ClockDocument} [doc]
 * @returns {() => void} Unsubscribes; calling it again does nothing.
 */
export function subscribe(callback, intervalMs, doc = globalThis.document) {
  subscribers.set(callback, intervalMs);

  if (!watched && doc) {
    watched = doc;
    watched.addEventListener('visibilitychange', onVisibility);
  }

  if (intervalMs() < scheduled) schedule();

  return () => {
    if (!subscribers.delete(callback) || subscribers.size > 0) return;
    stop();
    watched?.removeEventListener('visibilitychange', onVisibility);
    watched = undefined;
  };
}
