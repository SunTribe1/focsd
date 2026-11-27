import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { termFor } from '../internal/localize.js';
import { intervalFor, pickUnit, subscribe } from '../internal/relative-clock.js';
import { getLocale } from '../internal/locale.js';
import { warnOnce } from '../internal/warn.js';

/** `format="auto"` shows the date from a full week away, not from when rounding first reads "1 week". */
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Relative time: shows a date as text such as "3 hours ago", in a `time` element, and keeps it current
 * (unless `frozen`). The full date and time is the element's title and is also in visually hidden text
 * after the relative text, so it is read with it. All instances share one clock that ticks each minute while any of them is
 * under 2 hours away, else each hour, and pauses while the page is hidden. It has no live region: changes
 * are not announced. An invalid `datetime` renders nothing. On the server it renders the text for the
 * server's "now", which corrects itself once the element upgrades in the browser.
 *
 * @csspart time - The `<time>` element.
 */
export class FocsdRelativeTimeBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    datetime: {},
    format: {},
    frozen: { type: Boolean },
    locale: {},
  };

  constructor() {
    super();
    /** The moment to show, as an ISO 8601 date or date-time. */
    this.datetime = '';
    /** @type {'relative' | 'auto'} `relative` always reads as a distance; `auto` shows the date after 7 days. */
    this.format = 'relative';
    /** Stops the text updating as time passes (a new `datetime` still updates it). */
    this.frozen = false;
    /** A BCP 47 locale tag; defaults to the page's language. */
    this.locale = '';
  }

  /** @type {(() => void) | undefined} */
  #unsubscribe;

  /** @override */
  connectedCallback() {
    super.connectedCallback();
    this.#syncClock();
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#stopClock();
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    super.updated(changed);

    const timeChanged = changed.has('datetime') || changed.has('format');

    // A new time may need ticks more often than the clock runs now: subscribing again reschedules it.
    if (timeChanged) this.#stopClock();

    if (timeChanged || changed.has('frozen')) this.#syncClock();
  }

  #syncClock() {
    if (!this.frozen && this.isConnected && !this.#unsubscribe && this.#date()) {
      this.#unsubscribe = subscribe(
        () => this.requestUpdate(),
        () => this.#interval(),
      );
    } else if (this.frozen || !this.#date()) this.#stopClock();
  }

  #stopClock() {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
  }

  /** How often the text can change: each minute under 2 hours away, else each hour. */
  #interval() {
    const date = this.#date();

    return intervalFor(date ? date.getTime() - Date.now() : Number.NaN);
  }

  /** The `datetime` as a Date, or undefined when it is empty or not a date. */
  #date() {
    const date = new Date(this.datetime);

    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  /**
   * The relative text (or, for `auto` past 7 days, the date) and the full date and time.
   * @param {Date} date
   * @param {string | undefined} locale
   * @returns {{ relative: string, full: string }}
   */
  #texts(date, locale) {
    const diff = date.getTime() - Date.now();
    const full = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }).format(date);

    if (this.format === 'auto' && Math.abs(diff) >= WEEK_MS) {
      return { relative: new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date), full };
    }

    const picked = pickUnit(diff);

    // Under a full week, auto stays in days ("7 days ago" at 6.6 days), never "last week".
    const { value, unit } =
      this.format === 'auto' && picked.unit === 'week'
        ? { value: Math.round(diff / (WEEK_MS / 7)) || 0, unit: /** @type {const} */ ('day') }
        : picked;

    return { relative: new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(value, unit), full };
  }

  /** @override */
  render() {
    const date = this.#date();

    if (!date) {
      if (this.datetime)
        warnOnce(`relative-time:${this.datetime}`, `<focsd-relative-time>: "${this.datetime}" is not a date; nothing is shown.`);

      return nothing;
    }

    try {
      const { relative, full } = this.#texts(date, this.locale || this.localize.locale());
      const separator = termFor(this.locale || this.localize.lang(), 'listSeparator');

      return html`<time part="time" datetime=${this.datetime} title=${full} lang=${this.locale || getLocale() || nothing}
        >${relative}<span class="focsd-visually-hidden">${separator}${full}</span></time
      >`;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);

      warnOnce(`relative-time:${reason}`, `focsd-relative-time could not format the date: ${reason}`);

      return nothing;
    }
  }
}
