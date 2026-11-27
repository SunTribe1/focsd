import { expect, test } from './fixtures/test.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/parity.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-date-picker')));
});

const set = (page, id, props) =>
  page.evaluate(
    async ([i, p]) => {
      const el = document.getElementById(i);
      Object.assign(el, p);
      await el.updateComplete;
    },
    [id, props],
  );

test('autocomplete is forwarded to the inner inputs (OTP defaults to one-time-code)', async ({ page }) => {
  await expect(page.locator('#pt-otp input').first()).toHaveAttribute('autocomplete', 'one-time-code');
  await expect(page.locator('#pt-date input')).toHaveAttribute('autocomplete', 'off');
  await set(page, 'pt-country', { autocomplete: 'country' });
  await set(page, 'pt-date', { autocomplete: 'bday' });
  await set(page, 'pt-range', { autocomplete: 'off' });
  await expect(page.locator('#pt-country input')).toHaveAttribute('autocomplete', 'country');
  await expect(page.locator('#pt-date input')).toHaveAttribute('autocomplete', 'bday');
  await expect(page.locator('#pt-range input')).toHaveCount(2);

  for (const input of await page.locator('#pt-range input').all()) await expect(input).toHaveAttribute('autocomplete', 'off');
});

test('date picker: valueAsDate, valueAsNumber, step and showPicker', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const el = document.getElementById('pt-date');
    el.valueAsDate = new Date(Date.UTC(2026, 9, 5));
    await el.updateComplete;
    const fromDate = [el.value, el.valueAsNumber];
    el.valueAsNumber = Date.UTC(2026, 0, 2);
    const fromNumber = el.value;
    el.min = '2026-01-01';
    el.step = 7;
    el.value = '2026-01-09';
    await el.updateComplete;
    const mismatch = el.validity.stepMismatch;
    el.value = '2026-01-08';
    await el.updateComplete;
    const ok = el.validity.valid;
    el.value = '';

    return { fromDate, fromNumber, mismatch, ok, empty: [el.valueAsDate, Number.isNaN(el.valueAsNumber)] };
  });

  expect(r).toEqual({
    fromDate: ['2026-10-05', Date.UTC(2026, 9, 5)],
    fromNumber: '2026-01-02',
    mismatch: true,
    ok: true,
    empty: [null, true],
  });
  await page.evaluate(() => document.getElementById('pt-date').showPicker());
  await expect(page.locator('#pt-date dialog')).toBeVisible();
});

test('time field: min/max validation, valueAs*, stepUp/stepDown', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const el = document.getElementById('pt-time');
    Object.assign(el, { min: '09:00', max: '17:00', value: '08:30' });
    await el.updateComplete;
    const under = el.validity.rangeUnderflow;
    el.value = '17:30';
    await el.updateComplete;
    const over = el.validity.rangeOverflow;
    el.valueAsNumber = (10 * 60 + 15) * 60_000;
    const fromNumber = el.value;
    el.valueAsDate = new Date(Date.UTC(1970, 0, 1, 12, 5));
    const fromDate = [el.value, el.valueAsDate.toISOString()];
    el.step = 15;
    el.value = '16:30';
    el.stepUp(4);
    const capped = el.value;
    el.stepDown(2);

    return { under, over, fromNumber, fromDate, capped, down: el.value };
  });

  expect(r).toEqual({
    under: true,
    over: true,
    fromNumber: '10:15',
    fromDate: ['12:05', '1970-01-01T12:05:00.000Z'],
    capped: '17:00',
    down: '16:30',
  });
});

test('slider: valueAsNumber, stepUp and stepDown clamp to the range', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const el = document.getElementById('pt-vol');
    el.step = 10;
    el.stepUp(3);
    const up = el.valueAsNumber;
    el.stepUp(100);
    await el.updateComplete;
    const capped = el.value;
    el.valueAsNumber = 20;
    el.stepDown();
    await el.updateComplete;

    return [up, capped, el.value];
  });

  expect(r).toEqual([70, 100, 10]);
});

test('file upload: capture and webkitdirectory reach the native picker; showPicker throws when disabled', async ({ page }) => {
  await set(page, 'pt-file', { capture: 'environment', webkitdirectory: true });
  const input = page.locator('#pt-file input[type=file]');
  await expect(input).toHaveAttribute('capture', 'environment');
  await expect(input).toHaveAttribute('webkitdirectory', '');

  const error = await page.evaluate(async () => {
    const el = document.getElementById('pt-file');
    el.disabled = true;
    await el.updateComplete;

    try {
      el.showPicker();

      return null;
    } catch (e) {
      return e.name;
    }
  });

  expect(error).toBe('InvalidStateError');
});
