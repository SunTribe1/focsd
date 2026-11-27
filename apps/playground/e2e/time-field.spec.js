import { expect, test } from './fixtures/test.js';
import {
  openFromReviewFixes5,
  mountInMain as mount,
  openFromMinorsForms,
  mountFormInMain as mountFromMinorsInputs,
  openFromMinorsInputs,
  openFromParityReviewFixes,
} from './fixtures/pages.js';

// Re-homed from review-fixes-5.spec.js (Q48).

test('segment order and arrows agree in RTL; fieldset-disabled looks disabled', async ({ page }) => {
  await openFromReviewFixes5(page);
  await page.locator('#tf').evaluate((el) => el.setAttribute('dir', 'rtl'));
  const group = page.getByRole('group', { name: 'Meeting time' });
  const hours = group.getByRole('spinbutton', { name: 'Hours' });
  const minutes = group.getByRole('spinbutton', { name: 'Minutes' });
  const hx = (await hours.boundingBox()).x;
  const mx = (await minutes.boundingBox()).x;
  await hours.focus();
  await page.keyboard.press(mx > hx ? 'ArrowRight' : 'ArrowLeft');
  await expect(minutes).toBeFocused();

  const look = await page.locator('#tf').evaluate(async (el) => {
    const fs = document.createElement('fieldset');
    fs.disabled = true;
    el.before(fs);
    fs.append(el);
    await el.updateComplete;

    return getComputedStyle(el.shadowRoot.querySelector('[part~="field"]')).backgroundImage;
  });

  expect(look).not.toBe('none');
});

// Re-homed from minors-forms.spec.js (Q48).

test('a time range where min is after max wraps overnight', async ({ page }) => {
  await openFromMinorsForms(page);
  await mount(page, '<focsd-time-field id="tm" label="Shift" min="22:00" max="06:00" value="23:30"></focsd-time-field>');
  expect(await page.locator('#tm').evaluate((el) => el.validity.valid)).toBe(true);
  await page.locator('#tm').evaluate((el) => {
    el.value = '12:00';

    return el.updateComplete;
  });
  expect(await page.locator('#tm').evaluate((el) => el.validity.valid)).toBe(false);
});

// Re-homed from minors-inputs.spec.js (Q48).

test('minute arrows carry into the hour when the step does not divide 60', async ({ page }) => {
  await openFromMinorsInputs(page);
  await mountFromMinorsInputs(page, '<focsd-time-field id="t25" label="Slot" value="00:50" step="25" hour-cycle="h23"></focsd-time-field>');
  await page
    .locator('#t25')
    .getByRole('spinbutton', { name: /minute/i })
    .focus();
  await page.keyboard.press('ArrowUp');
  expect(await page.locator('#t25').evaluate((el) => el.value)).toBe('01:15');
});

test('an impossible second hour digit starts the minutes instead', async ({ page }) => {
  await openFromMinorsInputs(page);
  await mountFromMinorsInputs(
    page,
    '<focsd-time-field id="t23" label="At" hour-cycle="h23"></focsd-time-field><focsd-time-field id="t12" label="Alarm" hour-cycle="h12"></focsd-time-field>',
  );
  await page.locator('#t23').getByRole('spinbutton', { name: /hour/i }).focus();
  await page.keyboard.type('25');
  await page.keyboard.type('0');
  expect(await page.locator('#t23').evaluate((el) => el.value)).toBe('02:50');
  await page.locator('#t12').getByRole('spinbutton', { name: /hour/i }).focus();
  await page.keyboard.type('13');
  await page.keyboard.type('0');
  const [hour, minute] = await page.locator('#t12').evaluate((el) => [el._hour % 12, el._minute]);
  expect([hour, minute]).toEqual([1, 30]);
});

// Re-homed from parity-review-fixes.spec.js (Q48).

test('a read-only time field lets Escape and shortcuts through but blocks edits', async ({ page }) => {
  await openFromParityReviewFixes(page);

  const r = await page.evaluate(async () => {
    const el = document.getElementById('pt-time');
    Object.assign(el, { value: '10:00', readOnly: true });
    await el.updateComplete;
    const segment = el.shadowRoot.querySelector('[role="spinbutton"]');

    const press = (key, extra = {}) => {
      const ev = new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true, ...extra });
      segment.dispatchEvent(ev);

      return ev.defaultPrevented;
    };

    return { escape: press('Escape'), find: press('f', { ctrlKey: true }), up: press('ArrowUp'), value: el.value };
  });

  expect(r).toEqual({ escape: false, find: false, up: true, value: '10:00' });
});
