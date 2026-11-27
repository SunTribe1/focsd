import { expect, test } from './fixtures/test.js';
import { openFromReviewFixes5, mountFormInMain as mount, openFromMinorsInputs } from './fixtures/pages.js';

// Re-homed from review-fixes-5.spec.js (Q48).

const formData = (page) => page.locator('#inputs').evaluate((form) => Object.fromEntries(new FormData(form)));

test('clearing or partial typing never leaves a hidden value', async ({ page }) => {
  await openFromReviewFixes5(page);
  const input = page.getByRole('combobox', { name: 'Country' });
  await input.fill('ger');
  await page.getByRole('option', { name: 'Germany' }).click();
  await input.fill('');
  await input.press('Tab');
  await expect.poll(() => page.locator('#cb').evaluate((el) => el.value)).toBe('');
  expect((await formData(page)).country).toBeUndefined();
  await input.fill('ger');
  await page.getByRole('option', { name: 'Germany' }).click();
  await input.fill('Fra');
  await input.press('Tab');
  await expect(input).toHaveValue('Germany');
  await expect.poll(() => page.locator('#cb').evaluate((el) => el.value)).toBe('de');
  await page.locator('#cb').evaluate((el) => {
    el.value = 'gb';
  });
  await expect(input).toHaveValue('United Kingdom');
});

test('activedescendant never points at a removed option', async ({ page }) => {
  await openFromReviewFixes5(page);
  const input = page.getByRole('combobox', { name: 'Country' });
  await input.focus();

  for (let i = 0; i < 4; i += 1) await input.press('ArrowDown');
  await page.evaluate(() => {
    const cb = document.getElementById('cb');
    [...cb.children].slice(2).forEach((o) => o.remove());
  });
  await expect
    .poll(async () => {
      const id = await input.getAttribute('aria-activedescendant');

      if (!id) return 'none';

      return page.locator('#cb').evaluate((el, ref) => (el.shadowRoot.getElementById(ref) ? 'ok' : 'dangling'), id);
    })
    .not.toBe('dangling');
});

// Re-homed from minors-inputs.spec.js (Q48).

test('resetting the form while a combobox list is open closes it and restores the text', async ({ page }) => {
  await openFromMinorsInputs(page);
  await mount(
    page,
    '<focsd-combobox id="cr" label="Fruit" name="fruit" value="a"><focsd-option value="a">Apple</focsd-option><focsd-option value="b">Banana</focsd-option></focsd-combobox>',
  );
  const input = page.getByRole('combobox', { name: 'Fruit' });
  await input.fill('ban');
  await expect(page.locator('#cr').getByRole('listbox')).toBeVisible();
  await page.locator('#cr').evaluate((el) => {
    el.form.reset();

    return el.updateComplete;
  });
  await expect(page.locator('#cr').getByRole('listbox')).toBeHidden();
  await expect(input).toHaveValue('Apple');
});
