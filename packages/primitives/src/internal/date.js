/**
 * Calendar-date helpers. Dates are Date objects at UTC midnight, so no time zone can shift a day.
 */

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** One day in milliseconds. */
export const DAY = 86_400_000;

/**
 * A UTC-midnight date; month and day may overflow, as with `Date.UTC`. Unlike `Date.UTC`, years
 * 0-99 stay as written (Date.UTC reads them as 1900-1999).
 * @param {number} year
 * @param {number} month 0-based.
 * @param {number} day
 * @returns {Date}
 */
const utcDate = (year, month, day) => {
  const date = new Date(0);
  date.setUTCFullYear(year, month, day);

  return date;
};

/**
 * Parse `YYYY-MM-DD` into a UTC date, or null when the text is not a real calendar date.
 * @param {string | null | undefined} text
 * @returns {Date | null}
 */
export function parseISODate(text) {
  const match = ISO.exec(text ?? '');

  if (!match) return null;
  const [year = 0, month = 0, day = 0] = match.slice(1).map(Number);
  const date = utcDate(year, month - 1, day);

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}

/**
 * Format a UTC date as `YYYY-MM-DD`.
 * @param {Date} date
 * @returns {string}
 */
export function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * `YYYY-MM-DD` as milliseconds since the epoch at UTC midnight, or NaN when it is not a real date.
 * @param {string | null | undefined} text
 * @returns {number}
 */
export const isoToTime = (text) => parseISODate(text)?.getTime() ?? Number.NaN;

/**
 * Today's local calendar date, as a Date at UTC midnight (the form every helper here uses).
 * @returns {Date}
 */
export function todayUTC() {
  const now = new Date();

  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/**
 * @param {Date} date
 * @param {number} days
 * @returns {Date}
 */
export function addDays(date, days) {
  return utcDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days);
}

/**
 * Add months, clamping the day to the last day of the target month (Jan 31 + 1 month = Feb 28).
 * @param {Date} date
 * @param {number} months
 * @returns {Date}
 */
export function addMonths(date, months) {
  const first = utcDate(date.getUTCFullYear(), date.getUTCMonth() + months, 1);
  const lastDay = utcDate(first.getUTCFullYear(), first.getUTCMonth() + 1, 0).getUTCDate();

  return utcDate(first.getUTCFullYear(), first.getUTCMonth(), Math.min(date.getUTCDate(), lastDay));
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
const isoWeekday = (/** @type {Date} */ date) => date.getUTCDay() || 7;

/**
 * The first day of the week containing `date`, given the first weekday (1 = Monday, 7 = Sunday).
 * @param {Date} date
 * @param {number} firstDay
 * @returns {Date}
 */
export function startOfWeek(date, firstDay) {
  return addDays(date, -((isoWeekday(date) - firstDay + 7) % 7));
}

/**
 * Weeks of a month (`month` is 0-based) as rows of 7, with null for days outside the month.
 * @param {number} year
 * @param {number} month
 * @param {number} firstDay
 * @returns {(Date | null)[][]}
 */
export function monthWeeks(year, month, firstDay) {
  const first = utcDate(year, month, 1);
  /** @type {(Date | null)[][]} */
  const weeks = [];

  for (let day = startOfWeek(first, firstDay); day.getUTCMonth() === month || weeks.length === 0;) {
    /** @type {(Date | null)[]} */
    const week = [];

    for (let i = 0; i < 7; i += 1, day = addDays(day, 1)) week.push(day.getUTCMonth() === month ? day : null);
    weeks.push(week);
  }

  return weeks;
}

/**
 * First day of the week for a locale (1 = Monday, 7 = Sunday). Monday when unknown.
 * @param {string} locale
 * @returns {number}
 */
export function firstDayOfWeek(locale) {
  try {
    const loc = new Intl.Locale(locale);

    // getWeekInfo() (newer) or weekInfo (older engines): not yet in TypeScript's Intl types.
    const week = /** @type {{ getWeekInfo?: () => { firstDay: number }, weekInfo?: { firstDay: number } }} */ (
      /** @type {unknown} */ (loc)
    );

    const info = week.getWeekInfo ? week.getWeekInfo() : week.weekInfo;

    return info?.firstDay ?? 1;
  } catch {
    return 1;
  }
}
