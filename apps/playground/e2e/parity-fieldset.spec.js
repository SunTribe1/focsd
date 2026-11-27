import { expect, test } from './fixtures/test.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/parity.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-fieldset')));
});

const state = (page) =>
  page.evaluate(() => {
    const form = document.getElementById('pf3');

    return {
      data: Object.fromEntries(new FormData(form)),
      valid: form.checkValidity(),
      text: document.getElementById('pt-fs-text').matches(':disabled'),
      native: document.getElementById('pt-fs-native').disabled,
      button: document.getElementById('pt-fs-btn').matches(':disabled'),
    };
  });

test('fieldset disabled disables slotted controls, excludes them from the form and restores them', async ({ page }) => {
  expect(await state(page)).toEqual({ data: { street: '', zip: '123' }, valid: false, text: false, native: false, button: false });
  await page.evaluate(async () => {
    const fs = document.getElementById('pt-fs');
    fs.disabled = true;
    await fs.updateComplete;
  });
  await expect(page.locator('#pt-fs')).toHaveAttribute('disabled', '');
  expect(await state(page)).toEqual({ data: {}, valid: true, text: true, native: true, button: true });
  await expect(page.locator('#pt-fs-text [part~="control"]')).toBeDisabled();

  await page.evaluate(async () => {
    const fs = document.getElementById('pt-fs');
    fs.disabled = false;
    await fs.updateComplete;
  });
  expect(await state(page)).toEqual({ data: { street: '', zip: '123' }, valid: false, text: false, native: false, button: false });
  // A control the author disabled stays disabled.
  expect(await page.evaluate(() => document.getElementById('pt-fs-gift').disabled)).toBe(true);
  expect(await page.evaluate(() => document.getElementById('pt-fs').name)).toBe('ship');
});

test('controls added while the fieldset is disabled are disabled too', async ({ page }) => {
  const disabled = await page.evaluate(async () => {
    const fs = document.getElementById('pt-fs');
    fs.disabled = true;
    await fs.updateComplete;
    const input = Object.assign(document.createElement('input'), { name: 'late' });
    fs.append(input);
    await new Promise((r) => setTimeout(r));

    return input.disabled;
  });

  expect(disabled).toBe(true);
});

test('a fieldset reflects no empty error attribute', async ({ page }) => {
  const result = await page.locator('#pt-fs').evaluate(async (el) => {
    await el.updateComplete;
    const fresh = el.hasAttribute('error');

    el.error = 'Choose a shipping option';
    await el.updateComplete;
    const set = el.getAttribute('error');

    el.error = '';
    await el.updateComplete;

    return { fresh, set, cleared: el.hasAttribute('error'), message: el.shadowRoot.querySelector('[part~="error"]') };
  });

  expect(result).toEqual({ fresh: false, set: 'Choose a shipping option', cleared: false, message: null });
});
