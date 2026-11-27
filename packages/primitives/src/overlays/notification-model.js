/**
 * The data side of the notification center: cleaning the app's list, counting unread items, the badge
 * text, and the debounced "new notifications" announcement. No DOM, so it is unit-tested on its own.
 */

import { safeHref } from '../internal/safe-href.js';

/** @typedef {import('../internal/types.js').Tone} Tone */

/**
 * One notification, as the app passes it (owner ruling 75: the app owns the data).
 * @typedef {object} NotificationData
 * @property {string} id Unique within the list.
 * @property {string} title
 * @property {string} [body]
 * @property {string | number | Date} [time] When it happened: an ISO 8601 string, a Date or epoch milliseconds.
 * @property {boolean} [read]
 * @property {string} [href] Makes the title a link. Only `http:`, `https:`, `mailto:`, relative and `#fragment` URLs are kept; any other (`javascript:`, `data:`, …) is dropped.
 * @property {Tone} [tone]
 */

/** At most one "new notifications" message per this many milliseconds (spec wave 21). */
export const ARRIVAL_DELAY = 2000;

/**
 * The usable entries of `list` as new objects: each has an id (as a string) and a title; a repeated id keeps the first; an unsafe `href` is dropped.
 * @param {readonly NotificationData[] | null | undefined} list
 * @returns {NotificationData[]}
 */
export function cleanNotifications(list) {
  if (!Array.isArray(list)) return [];
  const usable = list.filter((n) => n instanceof Object && n.id !== '' && n.id != null && n.title);

  return usable.flatMap((n, i) =>
    usable.findIndex((m) => String(m.id) === String(n.id)) === i ? [withSafeHref({ ...n, id: String(n.id) })] : [],
  );
}

/**
 * `n` without its `href` when the link is not safe (see `safeHref`).
 * @param {NotificationData} n
 * @returns {NotificationData}
 */
function withSafeHref(n) {
  if (n.href == null) return n;
  const { href, ...rest } = n;
  const safe = safeHref(href);

  return safe ? { ...rest, href: safe } : rest;
}

/**
 * The ids of the unread notifications, in order.
 * @param {readonly NotificationData[]} list
 * @returns {string[]}
 */
export const unreadIds = (list) => list.filter((n) => !n.read).map((n) => n.id);

/**
 * The count shown on the badge: '' for none, else the count capped at `max` ("99+").
 * @param {number} count
 * @param {number} max
 * @returns {string}
 */
export function badgeText(count, max) {
  if (count <= 0) return '';

  return Number.isFinite(max) && max > 0 && count > max ? `${max}+` : String(count);
}

/**
 * `time` as an ISO 8601 string, or '' when it is not a date.
 * @param {unknown} time
 * @returns {string}
 */
export function isoTime(time) {
  if (time == null || time === '') return '';
  const date = new Date(/** @type {string | number | Date} */ (time));

  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

/**
 * Counts unread notifications that arrive after the first list it sees (the first load is never announced), and reports their number once
 * per window of `delay` ms, so rapid arrivals make one message and re-renders make none.
 */
export class ArrivalAnnouncer {
  /** @type {Set<string> | null} Every id seen so far; null before the first list. */
  #seen = null;

  #pending = 0;

  #timer = 0;

  #say;

  #delay;

  /**
   * @param {(count: number) => void} say Called with the number of new unread notifications.
   * @param {number} [delay]
   */
  constructor(say, delay = ARRIVAL_DELAY) {
    this.#say = say;
    this.#delay = delay;
  }

  /**
   * @param {readonly NotificationData[]} list The current list.
   * @param {boolean} [loaded] The app says the list is loaded: it is the baseline even when empty.
   */
  observe(list, loaded = false) {
    const seen = this.#seen;

    // Until the app says it is loaded, an empty list is not a baseline: the usual pattern renders
    // empty and then sets the fetched list.
    if (!seen && !list.length && !loaded) return;
    this.#seen = new Set([...(seen ?? []), ...list.map((n) => n.id)]);

    if (!seen) return;
    const fresh = list.filter((n) => !n.read && !seen.has(n.id)).length;

    if (!fresh) return;
    this.#pending += fresh;

    if (!this.#timer) this.#timer = Number(setTimeout(this.#flush, this.#delay));
  }

  #flush = () => {
    const count = this.#pending;
    this.#timer = 0;
    this.#pending = 0;

    if (count) this.#say(count);
  };

  /** Drop a pending message (the host left the page). */
  stop() {
    clearTimeout(this.#timer);
    this.#timer = 0;
    this.#pending = 0;
  }
}
