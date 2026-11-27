import { html, nothing } from 'lit';
import { cssomStyle } from '../internal/style.js';
import { hueNamed } from '../internal/hue.js';

/**
 * Calendar events: markers under a day's number, named in the day's accessible label, with an
 * optional legend of event kinds.
 *
 * @typedef {object} CalendarEvent
 * @property {string} date The day, `YYYY-MM-DD`.
 * @property {string} label What happens, read with the date ("Team sync").
 * @property {string} [kind] A category shown in the legend ("Meeting").
 * @property {string} [color] A category color (`blue`, `violet`, `pink`, `red`, `orange`, `amber`, `green`, `teal`); colorful presets such as Prismatic show it.
 * @property {import('../internal/types.js').Tone} [tone] A status color, shown in every preset; wins over `color`.
 */

/** Markers drawn under a day; more events are still named in its label. */
const MAX_MARKERS = 3;

/** A day as `YYYY-MM-DD`. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Tones with a color of their own (neutral falls through to the category color). */
const TONED = new Set(['positive', 'caution', 'critical', 'info']);

/**
 * The marker color of an event: its tone; else its category color, which a colorful preset sets
 * through the same hue hooks as tags and badges (`--focsd-hue-1` to `--focsd-hue-8`); else the link color.
 * @param {CalendarEvent} event
 */
function eventColor(event) {
  if (event.tone && TONED.has(event.tone)) return `var(--focsd-${event.tone})`;
  const hue = hueNamed(event.color);

  return hue ? `var(--focsd-hue-${hue}, var(--focsd-route))` : 'var(--focsd-route)';
}

/**
 * Valid events grouped by day.
 * @param {unknown} events
 * @returns {Map<string, CalendarEvent[]>}
 */
export function eventsByDate(events) {
  /** @type {Map<string, CalendarEvent[]>} */
  const byDate = new Map();

  if (!Array.isArray(events)) return byDate;

  for (const event of events) {
    // Events come from an attribute or app data: parse the date once, here.
    const date = String(event?.date ?? '');

    if (!ISO_DATE.test(date)) continue;
    byDate.set(date, [...(byDate.get(date) ?? []), { ...event, date }]);
  }

  return byDate;
}

/**
 * The text added to a day's accessible label: its events, in order.
 * @param {CalendarEvent[]} events
 */
export const eventsLabel = (events) => (events.length ? `, ${eventsText(events)}` : '');

/**
 * The events as a sentence part: each label with its kind ("Launch review (Deadline)").
 * @param {CalendarEvent[]} events
 */
export const eventsText = (events) =>
  events
    .flatMap((e) => {
      const label = String(e.label ?? '');
      const kind = String(e.kind ?? '');

      if (label && kind) return [`${label} (${kind})`];

      return label || kind ? [label || kind] : [];
    })
    .join(', ');

/**
 * The markers under a day (decorative: the day's label names the events).
 * @param {CalendarEvent[]} events
 */
export function eventMarkers(events) {
  if (!events.length) return nothing;

  return html`<span part="events" aria-hidden="true"
    >${events.slice(0, MAX_MARKERS).map((e) => html`<span part="event" style=${cssomStyle({ '--_event': eventColor(e) })}></span>`)}</span
  >`;
}

/**
 * The legend: one entry per event kind, in first-seen order, with that kind's color.
 * @param {Map<string, CalendarEvent[]>} byDate
 * @param {string} label the legend's accessible name
 */
export function eventLegend(byDate, label) {
  /** @type {Map<string, CalendarEvent>} */
  const kinds = new Map();

  for (const events of byDate.values()) for (const e of events) if (e.kind && !kinds.has(e.kind)) kinds.set(e.kind, e);

  if (!kinds.size) return nothing;

  return html`<ul part="legend" aria-label=${label}>
    ${[...kinds].map(
      ([kind, e]) =>
        html`<li part="legend-item"><span part="event" aria-hidden="true" style=${cssomStyle({ '--_event': eventColor(e) })}></span>${kind}</li>`,
    )}
  </ul>`;
}
