// cspell:ignore anad eine hier ablegen
import { expect, ready, test } from './fixtures/test.js';
// cspell:ignore preis

test.beforeEach(async ({ page }) => {
  await page.goto('/currency.html');
  await page.waitForFunction(() => customElements.get('focsd-currency-field'));
});

const box = (page, id) => page.locator(`#${id}`).getByRole('spinbutton');

test('formats on blur, shows a plain number while focused, keeps a dot-decimal value', async ({ page }) => {
  await expect(box(page, 'c')).toHaveValue('€1,234.50');
  await box(page, 'c').focus();
  await expect(box(page, 'c')).toHaveValue('1234.50');
  await expect(page.locator('#c [part~="prefix"]')).toHaveText('€');
  await expect(page.locator('#c')).toHaveJSProperty('value', '1234.50');
  await expect(box(page, 'c')).toHaveAttribute('aria-valuetext', '€1,234.50');
});

test('German input with comma decimals', async ({ page }) => {
  await box(page, 'cd').fill('1.234,5');
  await box(page, 'cd').blur();
  await expect(page.locator('#cd')).toHaveJSProperty('value', '1234.50');
  await expect(box(page, 'cd')).toHaveValue('1.234,50 €');
});

test('the currency is part of the accessible description and JPY has no decimals', async ({ page }) => {
  await expect(box(page, 'cj')).toHaveAccessibleDescription(/JPY/);
  await box(page, 'cj').fill('99.6');
  await box(page, 'cj').blur();
  await expect(page.locator('#cj')).toHaveJSProperty('value', '100');
  await expect(box(page, 'cj')).toHaveValue('JPY 100');
});

test('arrows step by the minor unit; ranges give formatted messages', async ({ page }) => {
  await box(page, 'c').focus();
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#c')).toHaveJSProperty('value', '1234.51');
  await expect(box(page, 'c')).toHaveValue('1234.51');
  await page.keyboard.press('PageDown');
  await expect(page.locator('#c')).toHaveJSProperty('value', '1234.41');
  await box(page, 'c').fill('20000');
  await box(page, 'c').blur();
  expect(await page.locator('#c').evaluate((el) => [el.validity.rangeOverflow, el.validationMessage])).toEqual([
    true,
    'Enter €10,000.00 or less',
  ]);
});

test('pasted symbols and junk', async ({ page }) => {
  await box(page, 'c').fill('$ 1,000');
  await box(page, 'c').blur();
  await expect(page.locator('#c')).toHaveJSProperty('value', '1000.00');
  await box(page, 'c').fill('ten');
  await box(page, 'c').blur();
  expect(await page.locator('#c').evaluate((el) => el.validity.badInput)).toBe(true);
  await expect(box(page, 'c')).toHaveValue('ten');
});

test('negative values need allow-negative; submit and reset', async ({ page }) => {
  await box(page, 'cj').fill('-5');
  await box(page, 'cj').blur();
  expect(await page.locator('#cj').evaluate((el) => el.validity.rangeUnderflow)).toBe(true);
  await box(page, 'cj').fill('10');
  await box(page, 'c').fill('10');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.locator('#out')).toContainText('["price","10.00"]');
  await expect(page.locator('#out')).toContainText('["yen","10"]');
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.locator('#c')).toHaveJSProperty('value', '1234.50');
});

test('input fires while typing, change on commit', async ({ page }) => {
  await box(page, 'c').fill('5');
  await box(page, 'c').blur();
  const types = await page.evaluate(() => window.__events.filter((e) => e.id === 'c').map((e) => e.type));
  expect(types).toContain('input');
  expect(types.at(-1)).toBe('change');
});

test('tabbing in and typing replaces the amount instead of appending to it', async ({ page }) => {
  await page.locator('#cd').getByRole('spinbutton').focus();
  await page.keyboard.press('Shift+Tab');
  await expect(box(page, 'c')).toBeFocused();
  await page.keyboard.type('7');
  await expect(page.locator('#c')).toHaveJSProperty('value', '7.00');
});

test('reset after junk input clears the text and the error (review I1)', async ({ page }) => {
  await box(page, 'cj').fill('abc');
  await box(page, 'cj').blur();
  expect(await page.locator('#cj').evaluate((el) => el.validity.badInput)).toBe(true);
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(box(page, 'cj')).toHaveValue('');
  expect(await page.locator('#cj').evaluate((el) => el.validity.valid)).toBe(true);
  await expect(box(page, 'cj')).not.toHaveAttribute('aria-invalid', 'true');
});

test('pasting the other common format reads the right amount (review I2)', async ({ page }) => {
  await box(page, 'c').fill('€1.234,56');
  await box(page, 'c').blur();
  await expect(page.locator('#c')).toHaveJSProperty('value', '1234.56');
  await box(page, 'cd').fill('1.5');
  await box(page, 'cd').blur();
  expect(await page.locator('#cd').evaluate((el) => el.validity.badInput)).toBe(true);
});

// Re-homed from deferred-minors.spec.js (Q48).

test('currency setRangeText edits the plain number, not the formatted text', async ({ page }) => {
  await page.goto('/currency.html');
  await ready(page, 'focsd-currency-field');

  const result = await page.locator('#c').evaluate(async (el) => {
    let inputs = 0;
    el.addEventListener('input', () => (inputs += 1));
    el.setRangeText('9', 0, 1);
    await el.updateComplete;

    return [el.value, el.validity.valid, inputs];
  });

  expect(result).toEqual(['9234.50', true, 0]);
});
