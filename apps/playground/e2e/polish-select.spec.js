import { expect, test } from './fixtures/test.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/parity.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-select')));
});

const listbox = (page, id) => page.locator(`#${id} [part~="listbox"]`);

test('open property drives the list', async ({ page }) => {
  await page.evaluate(() => (document.getElementById('pt-size').open = true));
  await expect(listbox(page, 'pt-size')).toBeVisible();
  await page.evaluate(() => (document.getElementById('pt-size').open = false));
  await expect(listbox(page, 'pt-size')).toBeHidden();
});

test('a select with no enabled options does not open an empty list', async ({ page }) => {
  await page.evaluate(async () => {
    const el = document.getElementById('pt-size');
    el.options.forEach((o) => (o.disabled = true));
    await el.updateComplete;
  });
  await page.locator('#pt-size [part~="trigger"]').click();
  await expect(listbox(page, 'pt-size')).toBeHidden();
});

test('removing the selected option selects the first option again (single)', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const el = document.getElementById('pt-size');
    el.selectedOption.remove();
    await new Promise((resolve) => setTimeout(resolve));
    await el.updateComplete;

    return [el.value, new FormData(document.getElementById('pf')).get('size')];
  });

  expect(r).toEqual(['s', 's']);
});

test('multiple: removing a selected option updates value and form data', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const el = document.getElementById('pt-langs');
    el.options[0].remove();
    await new Promise((resolve) => setTimeout(resolve));
    await el.updateComplete;

    return [el.value, new FormData(document.getElementById('pf')).getAll('langs')];
  });

  expect(r).toEqual(['fr', ['fr']]);
});

test('multiple: setting value selects that option alone; an unknown value clears', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const el = document.getElementById('pt-langs');
    el.value = 'en';
    await el.updateComplete;
    const one = el.selectedOptions.map((o) => o.value);
    el.value = 'zz';
    await el.updateComplete;

    return [one, el.selectedOptions.length, el.value];
  });

  expect(r).toEqual([['en'], 0, '']);
});
