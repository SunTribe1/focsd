import { expect, test } from './fixtures/test.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/parity.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-select')));
});

const formEntries = (page, name) => page.evaluate((n) => new FormData(document.getElementById('pf')).getAll(n), name);

test('option selected attribute sets the initial value; option API mirrors native', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const el = document.getElementById('pt-size');
    await el.updateComplete;
    const [s, m, l] = el.options;

    return {
      value: el.value,
      selectedIndex: el.selectedIndex,
      length: el.length,
      selected: [s.selected, m.selected, l.selected],
      defaultSelected: [s.defaultSelected, m.defaultSelected],
      index: l.index,
      text: l.text,
      label: [m.label, l.label],
      selectedOptions: el.selectedOptions.map((o) => o.value),
    };
  });

  expect(r).toEqual({
    value: 'm',
    selectedIndex: 1,
    length: 3,
    selected: [false, true, false],
    defaultSelected: [false, true],
    index: 2,
    text: 'Large',
    label: ['Medium', 'Large (L)'],
    selectedOptions: ['m'],
  });
  await expect(page.locator('#pt-size [part~="value"]')).toHaveText('Medium');
});

test('selectedIndex and option.selected setters change the value', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const el = document.getElementById('pt-size');
    el.selectedIndex = 2;
    const a = el.value;
    el.options[0].selected = true;
    const b = [el.value, el.selectedIndex];
    el.selectedIndex = -1;

    return { a, b, c: [el.value, el.selectedIndex] };
  });

  expect(r).toEqual({ a: 'l', b: ['s', 0], c: ['', -1] });
});

test('multiple: initial selection, one form entry per value, toggling keeps the list open', async ({ page }) => {
  const listbox = page.locator('#pt-langs [part~="listbox"]');
  await expect(listbox).toHaveAttribute('aria-multiselectable', 'true');
  expect(await formEntries(page, 'langs')).toEqual(['en', 'fr']);
  await expect(page.locator('#pt-langs [part~="value"]')).toHaveText('English, French');
  await page.locator('#pt-langs [part~="trigger"]').click();
  await expect(listbox).toBeVisible();
  await page.locator('#pt-langs focsd-option[value="de"]').click();
  await expect(listbox).toBeVisible();
  await expect(page.locator('#pt-langs focsd-option[value="de"]')).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space');
  await expect(page.locator('#pt-langs focsd-option[value="en"]')).toHaveAttribute('aria-selected', 'false');
  expect(await formEntries(page, 'langs')).toEqual(['de', 'fr']);
  expect(await page.evaluate(() => document.getElementById('pt-langs').value)).toBe('de');
  await page.keyboard.press('Escape');
  await expect(listbox).toBeHidden();
  await expect(page.locator('#pt-langs [part~="value"]')).toHaveText('German, French');
});

test('multiple: reset restores defaultSelected; required needs one value', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const el = document.getElementById('pt-langs');
    el.options.forEach((o) => (o.selected = false));
    el.required = true;
    await el.updateComplete;
    const missing = el.validity.valueMissing;
    document.getElementById('pf').reset();
    await el.updateComplete;

    return { missing, after: el.selectedOptions.map((o) => o.value), valid: el.validity.valid };
  });

  expect(r).toEqual({ missing: true, after: ['en', 'fr'], valid: true });
});

test('showPicker opens the list; throws when disabled', async ({ page }) => {
  await page.evaluate(() => document.getElementById('pt-size').showPicker());
  await expect(page.locator('#pt-size [part~="listbox"]')).toBeVisible();

  const error = await page.evaluate(async () => {
    const el = document.getElementById('pt-langs');
    el.disabled = true;
    await el.updateComplete;

    try {
      el.showPicker();

      return null;
    } catch (e) {
      return e.name;
    }
  });

  expect(error).toBe('InvalidStateError');
});
