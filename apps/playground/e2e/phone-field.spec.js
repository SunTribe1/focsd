// cspell:ignore الجوال السعر
// cspell:ignore anad eine hier ablegen
import { expect, ready, test } from './fixtures/test.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/phone.html');
  await page.waitForFunction(() => customElements.get('focsd-phone-field'));
});

const tel = (page, id = 'p') => page.locator(`#${id}`).getByRole('textbox');

// The country box shows the compact code ("GB +44"); the full name is its description (`title`), read and shown on hover.
const country = (page, id = 'p') => page.locator(`#${id}`).getByRole('combobox', { name: 'Country' });

test('a group with a country combobox and a described tel input', async ({ page }) => {
  await expect(page.getByRole('group', { name: 'Mobile' })).toBeVisible();
  await expect(country(page)).toHaveAttribute('title', /United Kingdom/);
  await expect(tel(page)).toHaveAttribute('type', 'tel');
  await expect(tel(page)).toHaveAttribute('autocomplete', 'tel-national');
  await expect(tel(page)).toHaveAccessibleDescription(/For example 7400 123456/);
});

test('typing a national number gives E.164', async ({ page }) => {
  await tel(page).fill('020 7183 8750');
  await tel(page).blur();
  await expect(page.locator('#p')).toHaveJSProperty('value', '+442071838750');
});

test('pasting +1 switches the country and announces it', async ({ page }) => {
  await tel(page).fill('+1 415 555 0132');
  await expect(country(page)).toHaveAttribute('title', /United States/);
  await expect(page.locator('#p').locator('[part~="status"]')).toHaveText('Country changed to United States');
  await expect(page.locator('#p')).toHaveJSProperty('value', '+14155550132');
  expect(await page.evaluate(() => window.__events.findLast((e) => e.id === 'p').type)).toBe('input');
});

test('country search by name, code and dial code, with preferred countries first', async ({ page }) => {
  await country(page).click();
  const options = page.locator('#p').getByRole('option');
  await expect(options.nth(0)).toContainText('United Kingdom');
  await expect(options.nth(1)).toContainText('United States');
  await country(page).fill('+353');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(country(page)).toHaveAttribute('title', /Ireland/);
  await country(page).fill('jp');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(country(page)).toHaveAttribute('title', /Japan/);
  await country(page).fill('ger');
  await page.keyboard.press('Escape');
  await expect(country(page)).toHaveAttribute('title', /Japan/);
});

test('invalid numbers are badInput with a country message; validator overrides', async ({ page }) => {
  await tel(page).fill('12');
  await tel(page).blur();
  expect(await page.locator('#p').evaluate((el) => [el.validity.badInput, el.validationMessage])).toEqual([
    true,
    'Enter a valid United Kingdom phone number',
  ]);
  await page.locator('#p').evaluate((el) => (el.validator = () => 'Office numbers only'));
  await tel(page).fill('020 7183 8750');
  await tel(page).blur();
  expect(await page.locator('#p').evaluate((el) => el.validationMessage)).toBe('Office numbers only');
  await page.locator('#p').evaluate((el) => (el.validator = () => true));
  expect(await page.locator('#p').evaluate((el) => el.validity.valid)).toBe(true);
});

test('submits E.164, resets, and shows a preset value formatted', async ({ page }) => {
  await expect(tel(page, 'pv')).toHaveValue('415 555 0132');
  await expect(country(page, 'pv')).toHaveAttribute('title', /United States/);
  await tel(page).fill('07400 123456');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.locator('#out')).toContainText('["mobile","+447400123456"],["office","+14155550132"]');
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(tel(page)).toHaveValue('');
  await expect(page.locator('#p')).toHaveJSProperty('value', '');
});

test('required and empty is valueMissing', async ({ page }) => {
  expect(await page.locator('#p').evaluate((el) => el.validity.valueMissing)).toBe(true);
});

test('a read-only field keeps its country under the keyboard too (review I4)', async ({ page }) => {
  await page.locator('#pv').evaluate((el) => el.setAttribute('readonly', ''));
  await country(page, 'pv').focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(country(page, 'pv')).toHaveAttribute('title', /United States/);
  await expect(page.locator('#pv')).toHaveJSProperty('value', '+14155550132');
  expect(await page.evaluate(() => window.__events.filter((e) => e.id === 'pv').length)).toBe(0);
});

// Re-homed from deferred-minors.spec.js (Q48).

const openPhoneFieldFromDeferredMinors = async (page) => {
  await page.goto('/phone.html');
  await ready(page, 'focsd-phone-field');
};

test('a country sharing its dial code survives a form state restore', async ({ page }) => {
  await openPhoneFieldFromDeferredMinors(page);

  const restored = await page.locator('#p').evaluate(async (el) => {
    // ElementInternals has no getter for the saved state: record what the control reports.
    let saved = null;
    const original = el.internals.setFormValue.bind(el.internals);
    el.internals.setFormValue = (value, state) => {
      saved = state === undefined ? value : state;
      original(value, state);
    };

    el.country = 'CA';
    await el.updateComplete;
    const telBox = el.shadowRoot.querySelector('[part~="control"]');
    telBox.value = '514 555 0123';
    telBox.dispatchEvent(new Event('input', { bubbles: true }));
    await el.updateComplete;
    const state = saved;
    el.formResetCallback();
    await el.updateComplete;
    el.formStateRestoreCallback(state, 'restore');
    await el.updateComplete;

    return [el.country, el.value];
  });

  expect(restored).toEqual(['CA', '+15145550123']);
});

test('typing a search does not rebuild country names', async ({ page }) => {
  await openPhoneFieldFromDeferredMinors(page);
  await page.evaluate(() => {
    window.__names = 0;
    const of = Intl.DisplayNames.prototype.of;
    Intl.DisplayNames.prototype.of = function (code) {
      window.__names += 1;

      return of.call(this, code);
    };
  });
  const countryBox = page.locator('#p').getByRole('combobox', { name: 'Country' });
  await countryBox.click();
  await countryBox.fill('c');
  await page.evaluate(() => (window.__names = 0));
  await countryBox.pressSequentially('anad');
  await expect(page.locator('#p').getByRole('option').first()).toContainText('Canada');
  expect(await page.evaluate(() => window.__names)).toBe(0);
});

// Re-homed from wave13-restore-rtl.spec.js (Q48).

test('phone and currency fields work in an Arabic page', async ({ page }) => {
  await page.goto('/phone.html');
  await page.waitForFunction(() => customElements.get('focsd-phone-field') && customElements.get('focsd-currency-field'));
  await page.evaluate(() => {
    const host = document.createElement('div');
    host.dir = 'rtl';
    host.lang = 'ar';
    host.innerHTML = `<focsd-phone-field id="rp" label="الجوال" default-country="SA"></focsd-phone-field>
      <focsd-currency-field id="rc" label="السعر" currency="SAR"></focsd-currency-field>`;
    document.querySelector('main').append(host);
  });
  const rtlTel = page.locator('#rp').getByRole('textbox');
  await rtlTel.fill('٠٥٠ ١٢٣ ٤٥٦٧');
  await rtlTel.blur();
  await expect(page.locator('#rp')).toHaveJSProperty('value', '+966501234567');
  const money = page.locator('#rc').getByRole('spinbutton');
  await money.fill('١٢٣٫٥');
  await money.blur();
  await expect(page.locator('#rc')).toHaveJSProperty('value', '123.50');
  const [telBox, countryBox] = await Promise.all([rtlTel.boundingBox(), page.locator('#rp').getByRole('combobox').boundingBox()]);
  expect(countryBox.x).toBeGreaterThan(telBox.x);
});
