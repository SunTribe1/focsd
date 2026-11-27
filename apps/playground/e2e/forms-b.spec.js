import { expect, test } from './fixtures/test.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/forms.html');
  await page.waitForFunction(() =>
    ['focsd-number-field', 'focsd-search-field', 'focsd-password-field', 'focsd-otp-field'].every((t) => customElements.get(t)),
  );
});

test('number field: spinbutton with value, step keys, bounds and labelled steppers', async ({ page }) => {
  const spin = page.getByRole('spinbutton', { name: 'Seats' });
  await expect(spin).toHaveAttribute('aria-valuenow', '10');
  await expect(spin).toHaveAttribute('aria-valuemin', '1');
  await expect(spin).toHaveAttribute('aria-valuemax', '50');
  await spin.focus();
  await page.keyboard.press('ArrowUp');
  await expect(spin).toHaveValue('11');
  await page.keyboard.press('PageDown');
  await expect(spin).toHaveValue('1');
  await page.keyboard.press('End');
  await expect(spin).toHaveValue('50');
  await page.keyboard.press('ArrowUp');
  await expect(spin).toHaveValue('50');
  await page.getByRole('button', { name: 'Decrease Seats' }).click();
  await expect(spin).toHaveValue('49');
  expect(await page.locator('#nf').evaluate((el) => el.value)).toBe('49');
  const steppers = await page.locator('#nf').evaluate((el) => [...el.shadowRoot.querySelectorAll('button')].map((b) => b.tabIndex));
  expect(steppers).toEqual([-1, -1]);
});

test('number field: out-of-range typed value is invalid', async ({ page }) => {
  await page.getByRole('spinbutton', { name: 'Seats' }).fill('80');
  expect(await page.locator('#nf').evaluate((el) => el.validity.rangeOverflow)).toBe(true);
  await page.getByRole('spinbutton', { name: 'Seats' }).fill('abc');
  expect(await page.locator('#nf').evaluate((el) => el.validity.badInput)).toBe(true);
});

test('number field: removing min and max removes the bounds', async ({ page }) => {
  const nf = page.locator('#nf');
  await nf.evaluate((el) => {
    el.removeAttribute('min');
    el.removeAttribute('max');
  });
  const spin = page.getByRole('spinbutton', { name: 'Seats' });
  await spin.fill('-5');
  expect(await nf.evaluate((el) => el.validity.valid)).toBe(true);
  await spin.fill('80');
  expect(await nf.evaluate((el) => el.validity.valid)).toBe(true);
  await nf.evaluate((el) => {
    el.value = '-5';
    el.stepDown();
  });
  expect(await nf.evaluate((el) => el.value)).toBe('-6');
  await spin.focus();
  await page.keyboard.press('ArrowDown');
  await expect(spin).toHaveValue('-7');
  await expect(spin).not.toHaveAttribute('aria-valuemin');
});

test('search field: searchbox with a clear button and Escape to clear', async ({ page }) => {
  const box = page.getByRole('searchbox', { name: 'Search members' });
  await expect(page.getByRole('button', { name: 'Clear search' })).toHaveCount(0);
  await box.fill('amara');
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(box).toHaveValue('');
  await expect(box).toBeFocused();
  await box.fill('lukas');
  await box.press('Escape');
  await expect(box).toHaveValue('');
});

test('password field: show/hide toggle keeps focus and value', async ({ page }) => {
  const field = page.getByLabel('Password', { exact: true });
  await field.fill('correct horse battery');
  const toggle = page.getByRole('button', { name: 'Show password' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('textbox', { name: 'Password', exact: true })).toHaveValue('correct horse battery');
  expect(await page.locator('#pf').evaluate((el) => el.shadowRoot.querySelector('[part~="control"]').type)).toBe('text');
  await toggle.click();
  expect(await page.locator('#pf').evaluate((el) => el.shadowRoot.querySelector('[part~="control"]').type)).toBe('password');
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('correct horse battery');
});

test('OTP field: labelled group of digit inputs; typing advances; backspace goes back; paste fills', async ({ page }) => {
  await expect(page.getByRole('group', { name: 'Verification code' })).toBeVisible();
  const first = page.getByRole('textbox', { name: 'Digit 1 of 6' });
  await expect(first).toHaveAttribute('autocomplete', 'one-time-code');
  await first.focus();
  await page.keyboard.type('123');
  await expect(page.getByRole('textbox', { name: 'Digit 4 of 6' })).toBeFocused();
  await page.keyboard.press('Backspace');
  await expect(page.getByRole('textbox', { name: 'Digit 3 of 6' })).toBeFocused();
  await expect(page.getByRole('textbox', { name: 'Digit 3 of 6' })).toHaveValue('');
  await page.locator('#otp').evaluate((el) => {
    const input = el.shadowRoot.querySelector('input');
    const data = new DataTransfer();
    data.setData('text/plain', '987654');
    const paste = new ClipboardEvent('paste', { bubbles: true, cancelable: true, composed: true });
    Object.defineProperty(paste, 'clipboardData', { value: data });
    input.dispatchEvent(paste);
  });
  expect(await page.locator('#otp').evaluate((el) => el.value)).toBe('987654');
});

test('form: required password and code block submit, then values submit; reset restores', async ({ page }) => {
  await page.locator('#account-submit').click();
  await expect(page.locator('#account-result')).toHaveText('');
  await page.getByLabel('Password', { exact: true }).fill('correct horse battery');
  await page.locator('#otp').evaluate((el) => {
    el.value = '123456';
  });
  await page.getByRole('searchbox', { name: 'Search members' }).fill('amara');
  await page.locator('#account-submit').click();
  await expect(page.locator('#account-result')).toHaveText('{"seats":"10","q":"amara","password":"correct horse battery","code":"123456"}');
  await page.locator('#account-reset').click();
  expect(await page.locator('#nf').evaluate((el) => el.value)).toBe('10');
  expect(await page.locator('#otp').evaluate((el) => el.value)).toBe('');
});
