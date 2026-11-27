import { expect, test } from './fixtures/test.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-03-15T10:00:00'));
  await page.goto('/date-time.html');
  await page.waitForFunction(() => customElements.get('focsd-date-time-picker'));
});

const group = (page) => page.getByRole('group', { name: 'Meeting' });
const value = (page) => page.locator('#m').evaluate((el) => el.value);

test('one group holds the date input, the dialog button and the time field', async ({ page }) => {
  await expect(group(page).getByRole('textbox', { name: 'Date' })).toHaveValue('2026-03-16');
  await expect(group(page).getByRole('button', { name: 'Choose date and time' })).toBeVisible();
  await expect(group(page).getByRole('group', { name: 'Time' })).toBeVisible();
});

test('both parts can be typed without the dialog', async ({ page }) => {
  await group(page).getByRole('textbox', { name: 'Date' }).fill('2026-03-20');
  await group(page).getByRole('spinbutton', { name: 'Hours' }).focus();
  await page.keyboard.type('14');
  expect(await value(page)).toBe('2026-03-20T14:30');
});

test('the dialog keeps the calendar and a time field, and closes on Done', async ({ page }) => {
  const trigger = group(page).getByRole('button', { name: 'Choose date and time' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Choose date and time' });
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('spinbutton', { name: 'Minutes' }).focus();
  await page.keyboard.press('ArrowUp');
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(await value(page)).toBe('2026-03-17T09:45');
});

test('Escape cancels the dialog without changing the value', async ({ page }) => {
  await group(page).getByRole('button', { name: 'Choose date and time' }).click();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  expect(await value(page)).toBe('2026-03-16T09:30');
});

test('min and max compare the whole timestamp', async ({ page }) => {
  await page.locator('#m').evaluate((el) => (el.value = '2026-03-01T07:45'));
  expect(await page.locator('#m').evaluate((el) => [el.validity.rangeUnderflow, el.validationMessage])).toEqual([
    true,
    'Choose a time on or after 2026-03-01T08:00.',
  ]);
});

test('form value is the local ISO timestamp, with no time zone; required; reset', async ({ page }) => {
  expect(await page.locator('#r').evaluate((el) => [el.validity.valueMissing, el.validationMessage])).toEqual([
    true,
    'Enter a date and time.',
  ]);
  await page.locator('#r').evaluate((el) => (el.value = '2026-04-01T12:00'));
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.locator('#out')).toContainText('["meeting","2026-03-16T09:30"],["reminder","2026-04-01T12:00"]');
  await page.getByRole('button', { name: 'Reset' }).click();
  expect(await value(page)).toBe('2026-03-16T09:30');
});

test('typed date digits are normalized, and each edit fires one input and one change', async ({ page }) => {
  const events = await page.locator('#m').evaluateHandle((el) => {
    const seen = [];

    for (const type of ['input', 'change']) el.addEventListener(type, () => seen.push(type));

    return seen;
  });

  await group(page).getByRole('textbox', { name: 'Date' }).fill('\u0662\u0660\u0662\u0666-\u0660\u0663-\u0662\u0660');
  expect(await value(page)).toBe('2026-03-20T09:30');
  // Leaving the date input (Tab) commits it: one input (the fill) and one change.
  await page.keyboard.press('Tab');
  await expect.poll(() => events.jsonValue()).toEqual(['input', 'change']);
  await group(page).getByRole('spinbutton', { name: 'Minutes' }).focus();
  await page.keyboard.press('ArrowUp');
  expect(await events.jsonValue()).toEqual(['input', 'change', 'input', 'change']);
  expect(await value(page)).toBe('2026-03-20T09:45');
});

test('reset clears a half-typed date and time; restore drops impossible timestamps', async ({ page }) => {
  const r = page.getByRole('group', { name: 'Reminder' });
  await r.getByRole('textbox', { name: 'Date' }).fill('2026-04-01');
  await r.getByRole('spinbutton', { name: 'Hours' }).focus();
  await page.keyboard.type('9');
  expect(await page.locator('#r').evaluate((el) => [el.value, el.validity.badInput])).toEqual(['', true]);
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(r.getByRole('textbox', { name: 'Date' })).toHaveValue('');
  await expect(r.getByRole('spinbutton', { name: 'Hours' })).toHaveAttribute('aria-valuetext', 'Empty');

  const restored = await page.locator('#r').evaluate((el) => {
    el.formStateRestoreCallback('2026-02-30T09:00');
    const bad = el.value;
    el.formStateRestoreCallback('2026-02-28T09:00');

    return [bad, el.value];
  });

  expect(restored).toEqual(['', '2026-02-28T09:00']);
  await page.locator('#r').evaluate((el) => (el.value = '2026-02-28T24:00'));
  expect(await page.locator('#r').evaluate((el) => el.validity.badInput)).toBe(true);
});

const record = (locator) =>
  locator.evaluateHandle((el) => {
    const seen = [];

    for (const type of ['input', 'change']) el.addEventListener(type, () => seen.push(type));

    return seen;
  });

test('Done shows a range error at once, and fires nothing when nothing changed', async ({ page }) => {
  const trigger = group(page).getByRole('button', { name: 'Choose date and time' });
  const dialog = page.getByRole('dialog', { name: 'Choose date and time' });
  const events = await record(page.locator('#m'));
  await trigger.click();
  await dialog.getByRole('button', { name: 'Done' }).click();
  expect(await events.jsonValue()).toEqual([]);
  await page.locator('#m').evaluate((el) => (el.value = '2026-03-02T07:45'));
  await trigger.click();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  await dialog.getByRole('button', { name: 'Done' }).click();
  expect(await events.jsonValue()).toEqual(['input', 'change']);
  await expect(page.locator('#m').locator('[part~="message"]')).toHaveText(/Choose a time on or after 2026-03-01T08:00\./);
});

test('half entries fire no events until the value changes', async ({ page }) => {
  const r = page.getByRole('group', { name: 'Reminder' });
  const events = await record(page.locator('#r'));
  await r.getByRole('textbox', { name: 'Date' }).fill('2026-04-01');
  await r.getByRole('spinbutton', { name: 'Hours' }).focus();
  // A date alone is no value: neither the fill nor leaving the date input fires anything.
  expect(await events.jsonValue()).toEqual([]);
  await page.keyboard.type('9');
  expect(await events.jsonValue()).toEqual([]);
  await page.keyboard.type('1');
  expect(await events.jsonValue()).toEqual(['input', 'change']);
  await page.keyboard.type('5');
  expect(await page.locator('#r').evaluate((el) => el.value)).toBe('2026-04-01T09:15');
});

// 14a-10 I-1: typed key by key, a half-typed date never reaches value, the form or input events.
test('a date typed key by key is no value until it is a real date', async ({ page }) => {
  const events = await record(page.locator('#m'));
  const date = group(page).getByRole('textbox', { name: 'Date' });
  await date.selectText();
  const seen = [];

  for (const key of '2026-1') {
    await page.keyboard.type(key);
    seen.push(await page.locator('#m').evaluate((el) => [el.value, new FormData(el.form).get('meeting')]));
  }

  expect(seen).toEqual(Array.from({ length: 6 }, () => ['', '']));
  expect(await events.jsonValue()).toEqual(['input']);
  await page.keyboard.type('0-02');
  expect(await value(page)).toBe('2026-10-02T09:30');
  await page.keyboard.press('Tab');
  expect(await events.jsonValue()).toEqual(['input', 'input', 'change']);
});

// 14a-10 I-2: leaving the date input fires change only when the value changed.
test('typing a date with no time and leaving fires no events', async ({ page }) => {
  const r = page.getByRole('group', { name: 'Reminder' });
  const events = await record(page.locator('#r'));
  await r.getByRole('textbox', { name: 'Date' }).pressSequentially('2026-04-01');
  await page.keyboard.press('Tab');
  expect(await page.locator('#r').evaluate((el) => el.value)).toBe('');
  expect(await events.jsonValue()).toEqual([]);
});

// 14a-10 M-9: the hint and the message also describe the inline time field.
test('the message describes the time field too, and follows its text', async ({ page }) => {
  // The time field's group carries the description, as its own hint does.
  const hours = group(page).getByRole('group', { name: 'Time' });
  await page.locator('#m').evaluate(async (el) => {
    el.error = 'Choose a time in office hours';
    await el.updateComplete;
  });
  await expect(hours).toHaveAccessibleDescription(/Choose a time in office hours/);
  await page.locator('#m').evaluate(async (el) => {
    el.error = 'That room is booked';
    await el.updateComplete;
  });
  await expect(hours).toHaveAccessibleDescription(/That room is booked/);
});

// 14b-10 (14a-10 re-review hand-off): the picker re-renders the time field only when the described text changed.
test('an update that leaves the description alone does not re-render the time field', async ({ page }) => {
  const counts = await page.locator('#m').evaluate(async (el) => {
    const time = el.shadowRoot.querySelector('[part~="time"][data-inline]');
    let requests = 0;
    const original = time.requestUpdate.bind(time);
    time.requestUpdate = (...args) => {
      requests += 1;

      return original(...args);
    };

    el.requestUpdate();
    await el.updateComplete;
    const same = requests;
    el.error = 'Choose a time in office hours';
    await el.updateComplete;
    time.requestUpdate = original;

    return [same, requests > same];
  });

  expect(counts).toEqual([0, true]);
});

// 14a-10 M-10: a date-only max allows that whole day; a date-only min starts at midnight.
test('a date-only min or max covers the whole day', async ({ page }) => {
  const result = await page.locator('#m').evaluate(async (el) => {
    el.min = '2026-03-16';
    el.max = '2026-03-31';
    el.value = '2026-03-31T17:00';
    await el.updateComplete;
    const lastDay = el.validity.valid;
    el.value = '2026-04-01T00:00';
    await el.updateComplete;
    const after = el.validity.rangeOverflow;
    el.value = '2026-03-16T00:00';
    await el.updateComplete;

    return [lastDay, after, el.validity.valid];
  });

  expect(result).toEqual([true, true, true]);
});

test('seconds are accepted and dropped; valueAsNumber outside years 1-9999 empties the value', async ({ page }) => {
  const result = await page.locator('#m').evaluate(async (el) => {
    el.value = '2026-03-16T09:30:59';
    el.min = '2026-03-01T08:00:30';
    await el.updateComplete;
    const trimmed = el.value;
    el.value = '2026-03-01T08:00';
    await el.updateComplete;
    const valid = el.validity.valid;
    el.valueAsNumber = Date.UTC(10_000, 0, 1);
    const tooLate = el.value;
    el.value = '2026-03-16T09:30';
    el.valueAsNumber = 8.64e15 + 1;

    return [trimmed, valid, tooLate, el.value];
  });

  expect(result).toEqual(['2026-03-16T09:30', true, '', '']);
});

test('a change follows any value-changing input, even after an input that changed nothing', async ({ page }) => {
  const events = await record(page.locator('#m'));
  await page.locator('#m').evaluate((el) => {
    const time = el.shadowRoot.querySelector('[part~="time"][data-inline]');
    time.value = '10:00';
    time.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    time.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    time.dispatchEvent(new Event('change', { bubbles: true }));
  });
  expect(await events.jsonValue()).toEqual(['input', 'change']);
  expect(await value(page)).toBe('2026-03-16T10:00');
});

test('Done compares with the current value, even one a script set while the dialog was open', async ({ page }) => {
  await group(page).getByRole('button', { name: 'Choose date and time' }).click();
  await page.keyboard.press('Enter');
  await page.locator('#m').evaluate((el) => (el.value = '2026-03-20T09:30'));
  const events = await record(page.locator('#m'));
  await page.getByRole('dialog', { name: 'Choose date and time' }).getByRole('button', { name: 'Done' }).click();
  expect(await events.jsonValue()).toEqual(['input', 'change']);
  expect(await value(page)).toBe('2026-03-16T09:30');
});

for (const theme of THEMES)
  test(`axe-clean, closed and open, in the ${theme} theme`, async ({ page }) => {
    await gotoInTheme(page, '/date-time.html', theme, 'focsd-date-time-picker');
    await expectAxeClean(page);
    await group(page).getByRole('button', { name: 'Choose date and time' }).click();
    await expectAxeClean(page);
  });
