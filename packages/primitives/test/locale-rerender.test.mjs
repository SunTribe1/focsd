// @vitest-environment happy-dom
// Wave 20 review minors 17 and 18: every element the changeset names re-renders on setLocale(),
// and the timeline item and file sizes now follow lang and setLocale() too.
import { afterEach, describe, expect, it } from 'vitest';
import './helpers/element-internals.js';
import { setLocale } from '../src/internal/locale.js';
import { formatBytes } from '../src/internal/files.js';
import { FocsdDateFieldBase } from '../src/inputs/date-field-base.js';
import { FocsdTimeFieldBase } from '../src/inputs/time-field-base.js';
import { FocsdCalendarBase } from '../src/inputs/calendar-base.js';
import { FocsdTimelineItemBase } from '../src/data/timeline-item-base.js';
import { FocsdFileUploadBase } from '../src/inputs/file-upload-base.js';

for (const [name, base] of Object.entries({
  'x-rr-date-field': FocsdDateFieldBase,
  'x-rr-time-field': FocsdTimeFieldBase,
  'x-rr-calendar': FocsdCalendarBase,
  'x-rr-timeline-item': FocsdTimelineItemBase,
  'x-rr-file-upload': FocsdFileUploadBase,
}))
  customElements.define(name, base);

afterEach(() => {
  setLocale(null);
  document.documentElement.removeAttribute('lang');
  document.body.replaceChildren();
});

/** Mount markup in an English page and return the element once rendered. */
async function mount(/** @type {string} */ markup) {
  document.documentElement.setAttribute('lang', 'en-US');
  document.body.innerHTML = markup;
  const el = /** @type {any} */ (document.body.firstElementChild);

  await el.updateComplete;

  return el;
}

/** The rendered text of a shadow root, attributes included (labels and values both count). */
const output = (/** @type {any} */ el) => el.shadowRoot.innerHTML.replaceAll(/<!--[^>]*-->/g, '');

describe('setLocale re-renders the elements that format with it (minor 18)', () => {
  it.each([
    ['date field', '<x-rr-date-field label="Day" value="2026-03-04"></x-rr-date-field>'],
    ['time field', '<x-rr-time-field label="At" value="13:05"></x-rr-time-field>'],
    ['calendar', '<x-rr-calendar value="2026-03-04"></x-rr-calendar>'],
    ['timeline item', '<x-rr-timeline-item datetime="2026-03-04" heading="Launch"></x-rr-timeline-item>'],
  ])('%s', async (_name, markup) => {
    const el = await mount(markup);
    const before = output(el);

    setLocale('de');
    await el.updateComplete;
    expect(output(el)).not.toBe(before);

    setLocale(null);
    await el.updateComplete;
    expect(output(el)).toBe(before);
  });
});

describe('timeline item follows lang (minor 17)', () => {
  it('formats the date in the nearest lang', async () => {
    const el = await mount('<x-rr-timeline-item datetime="2026-03-04" heading="Launch"></x-rr-timeline-item>');

    expect(el.shadowRoot.querySelector('time').textContent).toBe(
      new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date('2026-03-04')),
    );
    el.setAttribute('lang', 'de');
    el.heading = 'Start';
    await el.updateComplete;
    expect(el.shadowRoot.querySelector('time').textContent).toBe(
      new Intl.DateTimeFormat('de', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date('2026-03-04')),
    );
  });
});

describe('formatBytes takes a locale (minor 17, review item 129)', () => {
  it('formats the number and the unit in the given locale', () => {
    expect(formatBytes(1_500_000, 'en')).toBe('1.5 MB');
    expect(formatBytes(1_500_000, 'de')).toBe('1,5 MB');
    expect(formatBytes(2_500, 'fr')).toBe('2,5\u202Fko');
    expect(formatBytes(5, 'en')).toBe('5 bytes');
    expect(formatBytes(2_500, 'en')).toBe('2.5 kB');
  });

  it('defaults to the setLocale() locale', () => {
    setLocale('de');
    expect(formatBytes(1_500_000)).toBe('1,5 MB');
    setLocale(null);
  });

  it('the file upload formats its sizes with setLocale()', async () => {
    const el = await mount('<x-rr-file-upload label="Files" max-size="1500000"></x-rr-file-upload>');

    el._files = [new File(['x'.repeat(1500)], 'a.txt')];
    await el.updateComplete;
    expect(el.shadowRoot.querySelector('[part="file-size"]').textContent).toBe('1.5 kB');
    setLocale('de');
    await el.updateComplete;
    expect(el.shadowRoot.querySelector('[part="file-size"]').textContent).toBe('1,5 kB');
  });
});
