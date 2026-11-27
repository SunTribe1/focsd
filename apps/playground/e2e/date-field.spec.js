import { expect, test } from './fixtures/test.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/date-field.html');
  await page.waitForFunction(() => customElements.get('focsd-date-field'));
});

const seg = (page, id, name) => page.locator(`#${id}`).getByRole('spinbutton', { name });
const value = (page, id) => page.locator(`#${id}`).evaluate((el) => el.value);
const validity = (page, id) => page.locator(`#${id}`).evaluate((el) => [el.validity.valid, el.validity.badInput, el.validationMessage]);

test('segments follow the locale order, are named, and the month has a text value', async ({ page }) => {
  await expect(page.getByRole('group', { name: 'Date of birth' })).toBeVisible();
  const us = await page.locator('#d [role="spinbutton"]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  expect(us).toEqual(['Month', 'Day', 'Year']);
  const gb = await page.locator('#dgb [role="spinbutton"]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  expect(gb).toEqual(['Day', 'Month', 'Year']);
  await expect(seg(page, 'd', 'Month')).toHaveAttribute('aria-valuetext', 'March');
  await expect(seg(page, 'd', 'Day')).toHaveAttribute('aria-valuenow', '15');
});

test('Up and Down change the value and wrap; Left and Right move', async ({ page }) => {
  await seg(page, 'd', 'Month').focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(seg(page, 'd', 'Month')).toHaveAttribute('aria-valuetext', 'December');
  await page.keyboard.press('ArrowRight');
  await expect(seg(page, 'd', 'Day')).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(seg(page, 'd', 'Month')).toBeFocused();
  expect(await value(page, 'd')).toBe('1990-12-15');
});

test('digits type and auto-advance; Backspace clears and the value goes empty', async ({ page }) => {
  await seg(page, 'dgb', 'Day').focus();
  await page.keyboard.type('0704');
  await expect(seg(page, 'dgb', 'Year')).toBeFocused();
  await page.keyboard.type('2026');
  expect(await value(page, 'dgb')).toBe('2026-04-07');
  await page.keyboard.press('Backspace');
  expect(await value(page, 'dgb')).toBe('');
  expect(await validity(page, 'dgb')).toEqual([false, true, 'Enter a complete date.']);
});

test('impossible dates are badInput; non-leap Feb 29 too', async ({ page }) => {
  await seg(page, 'dgb', 'Day').focus();
  await page.keyboard.type('30022026');
  expect(await value(page, 'dgb')).toBe('');
  expect(await validity(page, 'dgb')).toEqual([false, true, 'Enter a real date, such as 2026-02-28.']);
  await seg(page, 'dgb', 'Day').focus();
  await page.keyboard.type('29022026');
  expect(await validity(page, 'dgb')).toEqual([false, true, 'Enter a real date, such as 2026-02-28.']);
});

test('pasting an ISO or a locale date fills every segment; a two-digit year is ignored', async ({ page }) => {
  const paste = (id, text) =>
    page
      .locator(`#${id} [role="spinbutton"]`)
      .first()
      .evaluate((el, t) => {
        const data = new DataTransfer();
        data.setData('text/plain', t);
        // Firefox copies an init `clipboardData` into an empty DataTransfer, so set it as forms-b.spec.js does.
        const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true, composed: true });
        Object.defineProperty(event, 'clipboardData', { value: data });
        el.dispatchEvent(event);
      }, text);

  await paste('dgb', '2026-10-15');
  expect(await value(page, 'dgb')).toBe('2026-10-15');
  await paste('dgb', '15/11/2026');
  expect(await value(page, 'dgb')).toBe('2026-11-15');
  await paste('d', '10/15/2026');
  expect(await value(page, 'd')).toBe('2026-10-15');
  await paste('d', '1/2/26');
  expect(await value(page, 'd')).toBe('2026-10-15');
});

test('a pasted or set impossible date is never shifted to a nearby day', async ({ page }) => {
  await page
    .locator('#dgb [role="spinbutton"]')
    .first()
    .evaluate((el) => {
      const data = new DataTransfer();
      data.setData('text/plain', '2026-02-30');
      const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true, composed: true });
      Object.defineProperty(event, 'clipboardData', { value: data });
      el.dispatchEvent(event);
    });
  expect(await value(page, 'dgb')).toBe('');
  await expect(seg(page, 'dgb', 'Day')).toHaveAttribute('aria-valuenow', '30');
  expect(await validity(page, 'dgb')).toEqual([false, true, 'Enter a real date, such as 2026-02-28.']);
  // Set from script, a date that is not real is dropped, as on a native date input.
  expect(
    await page.locator('#d').evaluate(async (el) => ((el.value = '2026-02-29'), await el.updateComplete, [el.value, el.valueAsDate])),
  ).toEqual(['', null]);
  await expect(seg(page, 'd', 'Day')).toHaveAttribute('aria-valuetext', 'Empty');
});

test('min and max give range errors', async ({ page }) => {
  await seg(page, 'dgb', 'Day').focus();
  await page.keyboard.type('31122025');
  expect(await page.locator('#dgb').evaluate((el) => [el.validity.rangeUnderflow, el.validationMessage])).toEqual([
    true,
    'Choose a date on or after 2026-01-01.',
  ]);
});

test('form value is ISO; required empty is valueMissing; reset restores', async ({ page }) => {
  expect(await page.locator('#dr').evaluate((el) => el.validity.valueMissing)).toBe(true);
  await seg(page, 'd', 'Year').focus();
  await page.keyboard.press('ArrowUp');
  await page.locator('#dr').evaluate((el) => (el.value = '2026-06-01'));
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.locator('#out')).toContainText('["dob","1991-03-15"]');
  await page.getByRole('button', { name: 'Reset' }).click();
  expect(await value(page, 'd')).toBe('1990-03-15');
});

test('input fires on every change, change on commit', async ({ page }) => {
  await page.evaluate(() => {
    window.__ev = [];

    for (const t of ['input', 'change']) document.querySelector('#d').addEventListener(t, () => window.__ev.push(t));
  });
  await seg(page, 'd', 'Day').focus();
  await page.keyboard.press('ArrowUp');
  expect(await page.evaluate(() => window.__ev)).toEqual(['input', 'change']);
});

// Segment-engine edges (14a-2 rulings): what the field does with each `value: null` from typeDigit.
const recordValues = (page, id) =>
  page.evaluate((i) => {
    window.__vals = [];
    const el = document.getElementById(i);

    for (const t of ['input', 'change']) el.addEventListener(t, () => window.__vals.push(`${t}:${el.value}`));
  }, id);

test('the year commits only when four digits are typed; no partial year is ever emitted', async ({ page }) => {
  await recordValues(page, 'd');
  await seg(page, 'd', 'Year').focus();
  await page.keyboard.type('202');
  await expect(seg(page, 'd', 'Year')).toHaveAttribute('aria-valuetext', '202');
  expect(await value(page, 'd')).toBe('1990-03-15');
  await page.keyboard.type('6');
  expect(await page.evaluate(() => window.__vals)).toEqual(['input:2026-03-15', 'change:2026-03-15']);
  // A year left unfinished is cleared, never read as year 19.
  await page.keyboard.type('19');
  await seg(page, 'd', 'Day').focus();
  await expect(seg(page, 'd', 'Year')).toHaveAttribute('aria-valuetext', 'Empty');
  expect(await value(page, 'd')).toBe('');
  expect(await validity(page, 'd')).toEqual([false, true, 'Enter a complete date.']);
});

test('a leading 0 waits for its second digit and fires nothing until then', async ({ page }) => {
  await recordValues(page, 'd');
  await seg(page, 'd', 'Day').focus();
  await page.keyboard.type('0');
  await expect(seg(page, 'd', 'Day')).toBeFocused();
  expect(await page.evaluate(() => window.__vals)).toEqual([]);
  await page.keyboard.type('9');
  await expect(seg(page, 'd', 'Year')).toBeFocused();
  expect(await page.evaluate(() => window.__vals)).toEqual(['input:1990-03-09', 'change:1990-03-09']);
});

// 14a-10 M-3: `00` no longer carries a 0 into the next segment; focus stays to retype.
test('00 clears the segment and keeps focus there', async ({ page }) => {
  await seg(page, 'dgb', 'Day').focus();
  await page.keyboard.type('15');
  await page.locator('#dgb').evaluate((el) => el.updateComplete);
  await seg(page, 'dgb', 'Day').focus();
  await page.keyboard.type('00');
  await expect(seg(page, 'dgb', 'Day')).toHaveAttribute('aria-valuetext', 'Empty');
  await expect(seg(page, 'dgb', 'Day')).toBeFocused();
  await page.keyboard.type('4');
  await expect(seg(page, 'dgb', 'Day')).toHaveAttribute('aria-valuenow', '4');
  await expect(seg(page, 'dgb', 'Month')).toBeFocused();
});

test('Up and Down on an empty segment start at the first and last value; an empty year starts at this year', async ({ page }) => {
  await seg(page, 'dr', 'Month').focus();
  await page.keyboard.press('ArrowDown');
  await expect(seg(page, 'dr', 'Month')).toHaveAttribute('aria-valuetext', 'December');
  await seg(page, 'dr', 'Day').focus();
  await page.keyboard.press('ArrowUp');
  await expect(seg(page, 'dr', 'Day')).toHaveAttribute('aria-valuenow', '1');
  await seg(page, 'dr', 'Year').focus();
  await page.keyboard.press('ArrowDown');
  const year = String(new Date().getFullYear());
  await expect(seg(page, 'dr', 'Year')).toHaveAttribute('aria-valuenow', year);
  expect(await value(page, 'dr')).toBe(`${year}-12-01`);
});

for (const theme of THEMES)
  test(`axe-clean in the ${theme} theme`, async ({ page }) => {
    await gotoInTheme(page, '/date-field.html', theme, 'focsd-date-field');
    await expectAxeClean(page);
  });

// Fix round 1 (review of e7101c2).
test('switching windows mid-year keeps the typed digits and fires nothing', async ({ page }) => {
  await recordValues(page, 'd');
  await seg(page, 'd', 'Year').focus();
  await page.keyboard.type('20');
  // A window or tab switch blurs the segment while it stays the active element; real tab switches are
  // not reliable in all three engines, so lose document focus and fire the blur the browser would.
  await seg(page, 'd', 'Year').evaluate((el) => {
    document.hasFocus = () => false;
    el.dispatchEvent(new FocusEvent('blur'));
  });
  await expect(seg(page, 'd', 'Year')).toHaveAttribute('aria-valuetext', '20');
  expect(await page.evaluate(() => window.__vals)).toEqual([]);
  await page.keyboard.type('26');
  expect(await value(page, 'd')).toBe('2026-03-15');
});

// 14a-10: a real blur (no stubbed hasFocus). Focus moving into a same-page iframe leaves the field:
// Chromium and WebKit keep document.hasFocus() true there, so the half-typed digits are cleared.
test('moving focus into a same-page iframe clears a half-typed year', async ({ page, browserName }) => {
  // Firefox (under Playwright) fires no blur on the segment when focus moves into a frame: see the 14a-10 Ruling.
  test.skip(browserName === 'firefox', 'Firefox fires no blur on the segment when focus moves into an iframe');
  await page.evaluate(() => {
    const frame = Object.assign(document.createElement('iframe'), { title: 'Notes frame', srcdoc: '<input aria-label="Note">' });
    document.body.append(frame);

    return new Promise((resolve) => frame.addEventListener('load', resolve));
  });
  await seg(page, 'd', 'Year').focus();
  await page.keyboard.type('20');
  await expect(seg(page, 'd', 'Year')).toHaveAttribute('aria-valuetext', '20');
  await page.frameLocator('iframe[title="Notes frame"]').getByRole('textbox', { name: 'Note' }).click();
  await expect(seg(page, 'd', 'Year')).toHaveAttribute('aria-valuetext', 'Empty');
});

// 14a-9: parseISODate keeps years 1-99 as written, so aria-valuemin=1 on the year is truthful.
test('years 1 to 99 are real years: typed, set and stepped', async ({ page }) => {
  await seg(page, 'd', 'Year').focus();
  await page.keyboard.type('0050');
  expect(await value(page, 'd')).toBe('0050-03-15');
  await expect(seg(page, 'd', 'Year')).toHaveAttribute('aria-valuenow', '50');
  await page.keyboard.press('ArrowDown');
  expect(await value(page, 'd')).toBe('0049-03-15');
  await page.locator('#d').evaluate((el) => (el.value = '0001-01-01'));
  expect(await value(page, 'd')).toBe('0001-01-01');
  expect(await validity(page, 'd')).toEqual([true, false, '']);
});

test('month names and segment order use the Gregorian calendar in every locale', async ({ page }) => {
  const read = (locale) =>
    page.evaluate(async (l) => {
      const el = document.createElement('focsd-date-field');
      Object.assign(el, { label: 'Probe', locale: l, value: '2026-03-15' });
      document.body.append(el);
      await el.updateComplete;
      const segments = [...el.shadowRoot.querySelectorAll('[role="spinbutton"]')];
      const month = segments.find((s) => s.getAttribute('aria-label') === 'Month').getAttribute('aria-valuetext');
      const expected = new Intl.DateTimeFormat(l, { month: 'long', calendar: 'gregory', timeZone: 'UTC' }).format(Date.UTC(2026, 2, 1));
      const yearSegment = segments.find((s) => s.getAttribute('aria-label') === 'Year');
      // The locale's own calendar year (2569 in the Buddhist calendar): what the field must not show.
      const localYear = new Intl.DateTimeFormat(l, { year: 'numeric', timeZone: 'UTC' }).format(Date.UTC(2026, 2, 1));
      const shown = [yearSegment.getAttribute('aria-valuenow'), yearSegment.getAttribute('aria-valuetext'), yearSegment.textContent.trim()];
      el.remove();

      return { month: month === expected, shown, localYear: localYear.replaceAll(/\D/g, ''), value: el.value };
    }, locale);

  expect(await read('fa')).toMatchObject({ month: true, shown: ['2026', '2026', '2026'], value: '2026-03-15' });
  // Discriminating: the Buddhist calendar reads this date as 2569, the field shows the Gregorian 2026.
  expect(await read('th-TH-u-ca-buddhist')).toEqual({
    month: true,
    shown: ['2026', '2026', '2026'],
    localYear: '2569',
    value: '2026-03-15',
  });
});

test('Arabic-Indic and Extended Arabic-Indic digits type and paste as ASCII digits', async ({ page }) => {
  await seg(page, 'dgb', 'Day').focus();
  await page.locator('#dgb').evaluate((host) => {
    for (const key of '٠٧٠٤۲۰۲۶') {
      const target = host.shadowRoot.activeElement;
      target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true }));
    }
  });
  expect(await value(page, 'dgb')).toBe('2026-04-07');
  await page
    .locator('#dgb [role="spinbutton"]')
    .first()
    .evaluate((el) => {
      const data = new DataTransfer();
      data.setData('text/plain', '٢٠٢٦-١٠-١٥');
      const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true, composed: true });
      Object.defineProperty(event, 'clipboardData', { value: data });
      el.dispatchEvent(event);
    });
  expect(await value(page, 'dgb')).toBe('2026-10-15');
});

test('reset drops uncommitted digits even when the value did not change', async ({ page }) => {
  await seg(page, 'd', 'Year').focus();
  await page.keyboard.type('20');
  await page.locator('#f').evaluate((form) => form.reset());
  await expect(seg(page, 'd', 'Year')).toHaveAttribute('aria-valuetext', '1990');
  await page.keyboard.type('2026');
  expect(await value(page, 'd')).toBe('2026-03-15');
});

test('restore drops out-of-range numbers and accepts an ISO state', async ({ page }) => {
  const restore = (state) =>
    page.locator('#dr').evaluate(async (el, s) => {
      el.formStateRestoreCallback(s);
      await el.updateComplete;
      const now = [...el.shadowRoot.querySelectorAll('[role="spinbutton"]')].map((x) => x.getAttribute('aria-valuenow'));

      return [el.value, now];
    }, state);

  expect(await restore('40,13,2026')).toEqual(['', [null, null, '2026']]);
  expect(await restore('2026-10-15')).toEqual(['2026-10-15', ['10', '15', '2026']]);
});

// 14a-10 review minors.
test('M-1: setting value to an empty string clears a half-typed date', async ({ page }) => {
  await seg(page, 'dr', 'Month').focus();
  await page.keyboard.type('04');
  await page.keyboard.type('07');
  expect(await value(page, 'dr')).toBe('');
  await page.locator('#dr').evaluate(async (el) => {
    el.value = '';
    await el.updateComplete;
  });
  await expect(seg(page, 'dr', 'Month')).toHaveAttribute('aria-valuetext', 'Empty');
  await expect(seg(page, 'dr', 'Day')).toHaveAttribute('aria-valuetext', 'Empty');
});

test('M-2: Backspace on an empty segment moves to the previous segment', async ({ page }) => {
  await seg(page, 'd', 'Day').focus();
  await page.keyboard.press('Backspace');
  await expect(seg(page, 'd', 'Day')).toHaveAttribute('aria-valuetext', 'Empty');
  await expect(seg(page, 'd', 'Day')).toBeFocused();
  await page.keyboard.press('Backspace');
  await expect(seg(page, 'd', 'Month')).toBeFocused();
  await expect(seg(page, 'd', 'Month')).toHaveAttribute('aria-valuetext', 'March');
});

test('M-3: typing 00 into the month clears it and carries nothing into the day', async ({ page }) => {
  await seg(page, 'd', 'Month').focus();
  await page.keyboard.type('00');
  await expect(seg(page, 'd', 'Month')).toHaveAttribute('aria-valuetext', 'Empty');
  await expect(seg(page, 'd', 'Day')).toHaveAttribute('aria-valuenow', '15');
  await expect(seg(page, 'd', 'Month')).toBeFocused();
});

test('M-4: stepping the day stops at the last day of the month', async ({ page }) => {
  await page.locator('#d').evaluate(async (el) => {
    el.value = '2026-02-28';
    await el.updateComplete;
  });
  await seg(page, 'd', 'Day').focus();
  await page.keyboard.press('ArrowUp');
  await expect(seg(page, 'd', 'Day')).toHaveAttribute('aria-valuenow', '1');
  expect(await value(page, 'd')).toBe('2026-02-01');
  await page.keyboard.press('ArrowDown');
  expect(await value(page, 'd')).toBe('2026-02-28');
  await page.locator('#d').evaluate(async (el) => {
    el.value = '2028-02-28';
    await el.updateComplete;
  });
  await page.keyboard.press('ArrowUp');
  expect(await value(page, 'd')).toBe('2028-02-29');
});
