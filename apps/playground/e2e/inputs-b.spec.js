import { expect, test } from './fixtures/test.js';

const TAGS = ['focsd-calendar', 'focsd-date-picker', 'focsd-date-range-picker', 'focsd-time-field', 'focsd-file-upload'];

test.beforeEach(async ({ page }) => {
  await page.goto('/inputs.html');
  await page.waitForFunction((tags) => tags.every((t) => customElements.get(t)), TAGS);
});

const submitResult = async (page) => {
  await page.locator('#inputs-submit').click();

  return JSON.parse(await page.locator('#inputs-result').textContent());
};

test('calendar: labelled grid, weekday headers, day names, selection and today semantics', async ({ page }) => {
  const cal = page.locator('#cal');
  const grid = cal.getByRole('grid', { name: 'March 2026' });
  await expect(grid).toBeVisible();
  const headers = grid.getByRole('columnheader');
  await expect(headers).toHaveCount(7);
  await expect(headers.first()).toHaveAccessibleName('Monday');
  const selected = grid.getByRole('gridcell', { name: 'Saturday, 14 March 2026' });
  await expect(selected).toHaveAttribute('aria-selected', 'true');
  await expect(selected).toHaveAttribute('tabindex', '0');
  await expect(grid.locator('[tabindex="0"]')).toHaveCount(1);
  await expect(grid.getByRole('gridcell', { name: 'Wednesday, 4 March 2026' })).toHaveAttribute('aria-disabled', 'true');
  await cal.getByRole('button', { name: 'Next month' }).click();
  await expect(cal.getByRole('grid', { name: 'April 2026' })).toBeVisible();
  await expect(cal.getByRole('heading', { name: 'April 2026' })).toHaveAttribute('aria-live', 'polite');
  await cal.getByRole('button', { name: 'Previous month' }).click();
  await expect(grid).toBeVisible();
});

test('calendar: arrows by day/week, PageUp/PageDown by month, Shift by year, Home/End, Enter selects', async ({ page }) => {
  const cal = page.locator('#cal');
  const cell = (name) => cal.getByRole('gridcell', { name });
  await cell('Saturday, 14 March 2026').focus();
  await page.keyboard.press('ArrowRight');
  await expect(cell('Sunday, 15 March 2026')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(cell('Sunday, 22 March 2026')).toBeFocused();
  await page.keyboard.press('Home');
  await expect(cell('Monday, 16 March 2026')).toBeFocused();
  await page.keyboard.press('End');
  await expect(cell('Sunday, 22 March 2026')).toBeFocused();
  await page.keyboard.press('PageDown');
  await expect(cell('Wednesday, 22 April 2026')).toBeFocused();
  await expect(cell('Wednesday, 22 April 2026')).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Enter');
  await expect(page.locator('#cal-result')).toHaveText('none');
  await page.keyboard.press('PageUp');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  await expect(page.locator('#cal-result')).toHaveText('2026-03-21');
  await expect(cell('Saturday, 21 March 2026')).toHaveAttribute('aria-selected', 'true');
  await expect(cell('Saturday, 14 March 2026')).toHaveAttribute('aria-selected', 'false');
  await page.keyboard.press('Shift+PageDown');
  await expect(cal.getByRole('grid', { name: 'March 2027' })).toBeVisible();
  await expect(cell('Sunday, 21 March 2027')).toBeFocused();
});

test('date picker: dialog picks a date, fills the input and returns focus; Escape cancels', async ({ page }) => {
  const input = page.getByRole('textbox', { name: 'Departure' });
  await expect(input).toHaveValue('2026-03-14');
  const button = page.locator('#dp').getByRole('button', { name: 'Choose date', exact: true });
  await button.click();
  const dialog = page.getByRole('dialog', { name: 'Choose date' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('gridcell', { name: 'Saturday, 14 March 2026' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(input).toHaveValue('2026-03-15');
  await expect(button).toBeFocused();
  await button.press('Enter');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(input).toHaveValue('2026-03-15');
  await expect(button).toBeFocused();
  expect((await submitResult(page)).departure).toBe('2026-03-15');
});

test('date picker: format hint, invalid and out-of-range dates block submit with a message', async ({ page }) => {
  const input = page.getByRole('textbox', { name: 'Departure' });
  await expect(input).toHaveAccessibleDescription(/YYYY-MM-DD/);
  await input.fill('2026-02-30');
  await page.locator('#inputs-submit').click();
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(input).toHaveAccessibleDescription(/Enter a date as YYYY-MM-DD\./);
  await expect(page.locator('#inputs-result')).toHaveText('');
  await input.fill('2026-01-01');
  await page.locator('#inputs-submit').click();
  await expect(input).toHaveAccessibleDescription(/Choose a date on or after 2026-03-05\./);
  await input.fill('2026-06-01');
  await expect(input).not.toHaveAttribute('aria-invalid', 'true');
  expect((await submitResult(page)).departure).toBe('2026-06-01');
});

// 14a-9: the shared dialog cuts min/max to their date part; a removed min (null) must not break it.
test('date picker: removing min and max keeps the calendar working', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const picker = page.locator('focsd-date-picker').first();
  await picker.evaluate(async (el) => {
    el.setAttribute('min', '2026-01-01');
    el.setAttribute('max', '2026-12-31');
    await el.updateComplete;
    el.removeAttribute('min');
    el.removeAttribute('max');
    await el.updateComplete;
    el.openDialog();
  });
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(errors).toEqual([]);
});

test('date range picker: two labelled inputs; first pick sets start, second sets end; form gets both', async ({ page }) => {
  const group = page.getByRole('group', { name: 'Trip dates' });
  await expect(group.getByRole('textbox', { name: 'Start date' })).toHaveValue('2026-05-04');
  await expect(group.getByRole('textbox', { name: 'End date' })).toHaveValue('2026-05-08');
  const button = group.getByRole('button', { name: 'Choose dates' });
  await button.click();
  const dialog = page.getByRole('dialog', { name: 'Choose dates' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('gridcell', { name: 'Wednesday, 6 May 2026' })).toHaveAttribute('aria-selected', 'true');
  await dialog.getByRole('gridcell', { name: 'Monday, 11 May 2026' }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('gridcell', { name: 'Wednesday, 6 May 2026' })).toHaveAttribute('aria-selected', 'false');
  await dialog.getByRole('gridcell', { name: 'Friday, 15 May 2026' }).click();
  await expect(dialog).toBeHidden();
  await expect(group.getByRole('textbox', { name: 'Start date' })).toHaveValue('2026-05-11');
  await expect(group.getByRole('textbox', { name: 'End date' })).toHaveValue('2026-05-15');
  await expect(button).toBeFocused();
  const result = await submitResult(page);
  expect([result['trip-start'], result['trip-end']]).toEqual(['2026-05-11', '2026-05-15']);
});

test('time field: spinbutton segments, arrows step, typed digits auto-advance, form value HH:MM', async ({ page }) => {
  const group = page.getByRole('group', { name: 'Meeting time' });
  const hours = group.getByRole('spinbutton', { name: 'Hours' });
  const minutes = group.getByRole('spinbutton', { name: 'Minutes' });
  await expect(hours).toHaveAttribute('aria-valuenow', '9');
  await expect(hours).toHaveAttribute('aria-valuetext', '09');
  await expect(hours).toHaveAttribute('aria-valuemax', '23');
  await expect(minutes).toHaveAttribute('aria-valuenow', '30');
  await hours.focus();
  await page.keyboard.press('ArrowUp');
  await expect(hours).toHaveAttribute('aria-valuenow', '10');
  await page.keyboard.press('ArrowRight');
  await expect(minutes).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(minutes).toHaveAttribute('aria-valuenow', '25');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.type('21');
  await expect(hours).toHaveAttribute('aria-valuenow', '21');
  await expect(minutes).toBeFocused();
  await page.keyboard.type('45');
  await expect(minutes).toHaveAttribute('aria-valuenow', '45');
  expect((await submitResult(page)).time).toBe('21:45');
});

// 14a-9: as the date field (fix round 1 of e7101c2), a window or tab switch keeps a half-typed hour.
test('time field: switching windows mid-hour keeps the typed digit', async ({ page }) => {
  const group = page.getByRole('group', { name: 'Meeting time' });
  const hours = group.getByRole('spinbutton', { name: 'Hours' });
  await hours.focus();
  await page.keyboard.type('1');
  // Real tab switches are not reliable in all three engines: lose document focus and fire the blur.
  await hours.evaluate((el) => {
    document.hasFocus = () => false;
    el.dispatchEvent(new FocusEvent('blur'));
  });
  await page.keyboard.type('5');
  await expect(hours).toHaveAttribute('aria-valuenow', '15');
  await expect(group.getByRole('spinbutton', { name: 'Minutes' })).toBeFocused();
});

test('time field: 12-hour cycle has an AM/PM segment', async ({ page }) => {
  const group = page.getByRole('group', { name: 'Alarm' });
  const hours = group.getByRole('spinbutton', { name: 'Hours' });
  const period = group.getByRole('spinbutton', { name: 'AM/PM' });
  await expect(hours).toHaveAttribute('aria-valuenow', '1');
  await expect(hours).toHaveAttribute('aria-valuemin', '1');
  await expect(hours).toHaveAttribute('aria-valuemax', '12');
  await expect(period).toHaveAttribute('aria-valuetext', 'PM');
  await period.focus();
  await page.keyboard.press('ArrowUp');
  await expect(period).toHaveAttribute('aria-valuetext', 'AM');
  expect((await submitResult(page)).alarm).toBe('01:05');
  await period.focus();
  await page.keyboard.press('p');
  await expect(period).toHaveAttribute('aria-valuetext', 'PM');
  expect((await submitResult(page)).alarm).toBe('13:05');
});

test('file upload: button opens the picker; list, remove, status; rejects wrong type and size', async ({ page }) => {
  const group = page.getByRole('group', { name: 'Attachments' });
  const choose = group.getByRole('button', { name: 'Choose files' });

  const pick = async (files) => {
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), choose.click()]);
    await chooser.setFiles(files);
  };

  await pick([
    { name: 'a.pdf', mimeType: 'application/pdf', buffer: Buffer.from('a') },
    { name: 'b.png', mimeType: 'image/png', buffer: Buffer.from('b') },
  ]);
  await expect(group.locator('[part~="status"]')).toHaveText('2 files selected');
  await expect(group.getByRole('listitem')).toHaveCount(2);
  await pick([
    { name: 'c.txt', mimeType: 'text/plain', buffer: Buffer.from('c') },
    { name: 'big.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(2_000_000) },
  ]);
  await expect(group.getByRole('alert')).toContainText('c.txt is not an accepted file type.');
  await expect(group.getByRole('alert')).toContainText('big.pdf is larger than 1 MB.');
  await expect(group.getByRole('listitem')).toHaveCount(2);
  await group.getByRole('button', { name: 'Remove a.pdf' }).click();
  await expect(group.locator('[part~="status"]')).toHaveText('1 file selected');
  await expect(choose).toBeFocused();
  await page.locator('#fu').evaluate((el) => {
    const data = new DataTransfer();
    data.items.add(new File(['d'], 'd.pdf', { type: 'application/pdf' }));
    const zone = el.shadowRoot.querySelector('[part~="dropzone"]');
    zone.dispatchEvent(new DragEvent('drop', { dataTransfer: data, bubbles: true, cancelable: true }));
  });
  await expect(group.getByRole('listitem')).toHaveText([/b\.png/, /d\.pdf/]);
  expect((await submitResult(page)).files).toEqual(['b.png', 'd.pdf']);
});

test('reset restores dates and times and clears files', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Departure' }).fill('2026-07-01');
  await page.getByRole('group', { name: 'Meeting time' }).getByRole('spinbutton', { name: 'Hours' }).focus();
  await page.keyboard.press('ArrowUp');
  await page.locator('#fu').evaluate((el) => {
    const data = new DataTransfer();
    data.items.add(new File(['d'], 'd.pdf', { type: 'application/pdf' }));
    el.shadowRoot
      .querySelector('[part~="dropzone"]')
      .dispatchEvent(new DragEvent('drop', { dataTransfer: data, bubbles: true, cancelable: true }));
  });
  await page.locator('#inputs-reset').click();
  await expect(page.getByRole('textbox', { name: 'Departure' })).toHaveValue('2026-03-14');
  await expect(page.getByRole('group', { name: 'Meeting time' }).getByRole('spinbutton', { name: 'Hours' })).toHaveAttribute(
    'aria-valuenow',
    '9',
  );
  await expect(page.getByRole('group', { name: 'Attachments' }).getByRole('listitem')).toHaveCount(0);
});

// 14a-10 M-6: the time field reads Arabic-Indic digits as the date field does.
test('time field: Arabic-Indic and Extended Arabic-Indic digits type as ASCII digits', async ({ page }) => {
  const group = page.getByRole('group', { name: 'Meeting time' });
  await group.getByRole('spinbutton', { name: 'Hours' }).focus();
  await group.evaluate((el) => {
    const host = el.getRootNode().host;

    for (const key of '١٤۳۰') {
      host.shadowRoot.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true }));
    }
  });
  await expect(group.getByRole('spinbutton', { name: 'Hours' })).toHaveAttribute('aria-valuenow', '14');
  await expect(group.getByRole('spinbutton', { name: 'Minutes' })).toHaveAttribute('aria-valuenow', '30');
});
