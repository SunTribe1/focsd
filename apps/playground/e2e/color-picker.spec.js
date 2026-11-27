// cspell:ignore blurple
import { expect, test } from './fixtures/test.js';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test.beforeEach(async ({ page }) => {
  await page.goto('/color.html');
  await page.waitForFunction(() => customElements.get('focsd-color-picker'));
});

const cp = (page) => page.locator('#cp');

test('trigger names the color and opens a popover that returns focus on Escape', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Brand color: #3366ff' });
  await trigger.click();
  const area = page.getByRole('slider', { name: 'Saturation and brightness' }).first();
  await expect(area).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

test('the 2D area works by keyboard and reports both values', async ({ page }) => {
  await page.getByRole('button', { name: /Brand color/ }).click();
  const area = cp(page).getByRole('slider', { name: 'Saturation and brightness' });
  const before = await area.getAttribute('aria-valuetext');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Shift+ArrowLeft');
  await expect(area).not.toHaveAttribute('aria-valuetext', before);
  await expect(area).toHaveAttribute('aria-valuetext', /^Saturation \d+%, brightness \d+%$/);
  await expect(cp(page)).not.toHaveJSProperty('value', '#3366ff');
});

test('typing any CSS color normalizes to the format; junk is badInput', async ({ page }) => {
  const field = page.locator('#cpi').getByRole('textbox');
  await field.fill('rgb(255 0 0)');
  await field.press('Enter');
  await expect(page.locator('#cpi')).toHaveJSProperty('value', 'oklch(62.8% 0.2577 29.23)');
  await field.fill('blurple');
  await field.press('Enter');
  expect(await page.locator('#cpi').evaluate((el) => el.validity.badInput)).toBe(true);
  expect(await page.locator('#cpi').evaluate((el) => el.validationMessage)).toBe('Enter a color such as #3366ff');
});

test('swatches are a radio group with roving focus', async ({ page }) => {
  await page.getByRole('button', { name: /Brand color/ }).click();
  const group = cp(page).getByRole('radiogroup', { name: 'Swatches' });
  await group.getByRole('radio').first().focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await expect(cp(page)).toHaveJSProperty('value', '#ffffff');
  await expect(group.getByRole('radio', { name: '#ffffff' })).toHaveAttribute('aria-checked', 'true');
});

test('hue and alpha sliders, contrast status', async ({ page }) => {
  const picker = page.locator('#cpi');
  await picker.getByRole('slider', { name: 'Hue' }).focus();
  await page.keyboard.press('End');
  await picker.getByRole('slider', { name: 'Opacity' }).focus();
  await page.keyboard.press('Home');
  expect(await picker.evaluate((el) => el.value)).toMatch(/\/ 0\)$/);
  await expect(picker.locator('[part~="contrast"]')).toContainText(/Contrast [\d.]+:1 against #ffffff/);
});

test('submits, resets and fires input then change', async ({ page }) => {
  await page.getByRole('button', { name: /Brand color/ }).click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  const events = await page.evaluate(() => window.__events.map((e) => e.type));
  expect(events.slice(0, 2)).toEqual(['input', 'change']);
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.locator('#out')).toContainText('"brand"');
  await expect(page.locator('#out')).toContainText('["accent","oklch(');
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(cp(page)).toHaveJSProperty('value', '#3366ff');
});

test('pointer drag on the area changes the value, and the eyedropper only shows when supported', async ({ page }) => {
  await page.getByRole('button', { name: /Brand color/ }).click();
  const area = page.locator('#cp [part~="area"]');
  // locator.click waits for the opening panel to stop moving before measuring the position.
  const box = await area.boundingBox();
  await area.click({ position: { x: box.width - 2, y: 2 } });
  expect(await cp(page).evaluate((el) => el.value)).toMatch(/^#[0-9a-f]{6}$/);
  await expect(cp(page).getByRole('slider', { name: 'Saturation and brightness' })).toHaveAttribute(
    'aria-valuetext',
    /Saturation (9\d|100)%, brightness (9\d|100)%/,
  );
  const supported = await page.evaluate(() => 'EyeDropper' in window);
  await expect(cp(page).getByRole('button', { name: 'Pick color from screen' })).toHaveCount(supported ? 1 : 0);
});

test('required with an empty value is valueMissing; disabled blocks the trigger', async ({ page }) => {
  await cp(page).evaluate((el) => {
    el.required = true;
    el.value = '';
  });
  expect(await cp(page).evaluate((el) => el.validity.valueMissing)).toBe(true);
  await cp(page).evaluate((el) => (el.disabled = true));
  await expect(page.getByRole('button', { name: /Brand color/ })).toBeDisabled();
});

test('reset after junk text shows the default again (review I9)', async ({ page }) => {
  await page.getByRole('button', { name: /Brand color/ }).click();
  const field = cp(page).getByRole('textbox');
  await field.fill('zzz');
  await field.press('Enter');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Reset' }).click();
  await page.getByRole('button', { name: /Brand color/ }).click();
  await expect(field).toHaveValue('#3366ff');
  expect(await cp(page).evaluate((el) => el.validity.valid)).toBe(true);
});
