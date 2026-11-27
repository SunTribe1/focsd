// @vitest-environment happy-dom
// Category hues (Prismatic), the shared icon helper, calendar events and the tag's color attribute.
import { afterEach, describe, expect, it } from 'vitest';
import './helpers/element-internals.js';
import { hueNamed, hueOf, syncHue } from '../src/internal/hue.js';
import { eventsByDate, eventsLabel, eventsText } from '../src/inputs/calendar-events.js';
import { FocsdButtonBase } from '../src/button/button-base.js';
import { labelText } from '../src/internal/text.js';
import { FocsdTagBase } from '../src/display/tag-base.js';
import { FocsdCalendarBase } from '../src/inputs/calendar-base.js';

customElements.define('x-hue-button', FocsdButtonBase);

customElements.define('x-hue-tag', FocsdTagBase);

customElements.define('x-hue-calendar', FocsdCalendarBase);

afterEach(() => {
  document.body.innerHTML = '';
});

/**
 * @param {string} markup
 * @returns {Promise<any>}
 */
async function mount(markup) {
  document.body.innerHTML = markup;
  const el = /** @type {any} */ (document.body.firstElementChild);

  await el.updateComplete;

  return el;
}

describe('hues', () => {
  it('gives the same name the same hue, always 1 to 8', () => {
    for (const name of ['Amara Okafor', 'Lukas Brandt', '', 'Ω']) {
      const hue = hueOf(name);

      expect(hue).toBe(hueOf(name));
      expect(hue).toBeGreaterThanOrEqual(1);
      expect(hue).toBeLessThanOrEqual(8);
    }

    expect(hueOf('  Amara Okafor ')).toBe(hueOf('amara okafor'));
  });

  it('maps color names and 1–8 to hues, anything else to 0', () => {
    expect(hueNamed('blue')).toBe(1);
    expect(hueNamed('Violet')).toBe(2);
    expect(hueNamed('teal')).toBe(8);
    expect(hueNamed(3)).toBe(3);
    expect(hueNamed('9')).toBe(0);
    expect(hueNamed('chartreuse')).toBe(0);
    expect(hueNamed(undefined)).toBe(0);
  });

  it('mirrors a hue on data-hue and removes it for 0', () => {
    const el = document.createElement('div');

    syncHue(el, 4);
    expect(el.dataset.hue).toBe('4');
    syncHue(el, 0);
    expect(el.dataset.hue).toBeUndefined();
  });

  it('reflects a tag color as data-hue', async () => {
    const tag = await mount('<x-hue-tag color="green">Growth</x-hue-tag>');

    expect(tag.dataset.hue).toBe('7');
    tag.color = 'nope';
    await tag.updateComplete;
    expect(tag.dataset.hue).toBeUndefined();
  });
});

describe('leading icon', () => {
  it('reads a label without the slotted icon (an icon-font ligature is text too)', () => {
    const host = document.createElement('div');

    host.innerHTML = '<i slot="icon" class="material-symbols">home</i>  Go   <b>home</b> page ';
    expect(labelText(host)).toBe('Go home page');
  });

  it('hides the icon box when there is no icon, and keeps the slot for one', async () => {
    const button = await mount('<x-hue-button>Save</x-hue-button>');
    const box = button.shadowRoot.querySelector('span[part~="icon"]');

    expect(box.hidden).toBe(true);
    expect(box.getAttribute('aria-hidden')).toBe('true');
    expect(box.querySelector('slot[name="icon"]')).not.toBeNull();
  });

  it('shows the box for a slotted icon', async () => {
    const button = await mount('<x-hue-button><svg slot="icon" viewBox="0 0 24 24"></svg>Ship</x-hue-button>');

    expect(button.shadowRoot.querySelector('span[part~="icon"]').hidden).toBe(false);
  });

  it('shows the box for a named icon', async () => {
    const button = await mount('<x-hue-button icon="check">Done</x-hue-button>');

    expect(button.shadowRoot.querySelector('span[part~="icon"]').hidden).toBe(false);
  });
});

describe('calendar events', () => {
  const events = [
    { date: '2026-11-17', label: 'Team sync', kind: 'Meeting', color: 'blue' },
    { date: '2026-11-17', label: 'Design critique', kind: 'Review' },
    { date: '2026-11-21', kind: 'Deadline', tone: 'critical' },
    { date: 'not a date', label: 'Dropped' },
    null,
  ];

  it('groups valid events by day and drops the rest', () => {
    const byDate = eventsByDate(events);

    expect([...byDate.keys()]).toEqual(['2026-11-17', '2026-11-21']);
    expect(byDate.get('2026-11-17')).toHaveLength(2);
    expect(eventsByDate('nope').size).toBe(0);
  });

  it('names each event with its kind', () => {
    const byDate = eventsByDate(events);

    expect(eventsText(byDate.get('2026-11-17') ?? [])).toBe('Team sync (Meeting), Design critique (Review)');
    expect(eventsLabel(byDate.get('2026-11-21') ?? [])).toBe(', Deadline');
    expect(eventsLabel([])).toBe('');
  });

  it('adds events to the day label and tooltip, and lists kinds in the legend', async () => {
    const calendar = await mount('<x-hue-calendar value="2026-11-26" locale="en-US" legend></x-hue-calendar>');

    calendar.events = events;
    await calendar.updateComplete;
    const day = calendar.shadowRoot.querySelector('[data-date="2026-11-17"]');

    expect(day.getAttribute('aria-label')).toMatch(/Team sync \(Meeting\), Design critique \(Review\)$/);
    expect(day.getAttribute('title')).toBe('Team sync (Meeting), Design critique (Review)');
    expect(day.querySelectorAll('[part~="event"]')).toHaveLength(2);
    expect([...calendar.shadowRoot.querySelectorAll('[part~="legend-item"]')].map((li) => li.textContent.trim())).toEqual([
      'Meeting',
      'Review',
      'Deadline',
    ]);
  });
});
