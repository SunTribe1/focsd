// cspell:ignore Économie Łódź
import { expect, test } from './fixtures/test.js';
import { clickInert } from './fixtures/dom.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/listbox.html');
  await page.waitForFunction(() => customElements.get('focsd-listbox'));
});

const box = (page, name) => page.getByRole('listbox', { name });

const active = (page, name) =>
  box(page, name).evaluate((el) => el.getRootNode().getElementById(el.getAttribute('aria-activedescendant'))?.textContent.trim());

test('single: focus is on the listbox, selection follows focus, disabled options are skipped', async ({ page }) => {
  await box(page, 'Shipping speed').focus();
  expect(await active(page, 'Shipping speed')).toBe('Standard (5–7 days)');
  await page.keyboard.press('ArrowDown');
  expect(await active(page, 'Shipping speed')).toBe('Express (2 days)');
  await expect(page.locator('#ship')).toHaveJSProperty('value', 'express');
  await page.keyboard.press('ArrowDown');
  expect(await active(page, 'Shipping speed')).toBe('Express (2 days)');
  await page.keyboard.press('Home');
  await expect(page.locator('#ship')).toHaveJSProperty('value', 'standard');
  await expect(box(page, 'Shipping speed').getByRole('option', { name: 'Overnight' })).toHaveAttribute('aria-disabled', 'true');
});

test('typeahead moves to the next match', async ({ page }) => {
  await box(page, 'Shipping speed').focus();
  await page.keyboard.press('e');
  expect(await active(page, 'Shipping speed')).toBe('Express (2 days)');
});

test('multiple: Space toggles, Shift+Down extends, Ctrl/Meta+A selects all', async ({ page }) => {
  const list = box(page, 'Toppings');
  await expect(list).toHaveAttribute('aria-multiselectable', 'true');
  await list.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('Shift+ArrowDown');
  await expect(page.locator('#top')).toHaveJSProperty('values', ['mozzarella', 'feta']);
  await page.keyboard.press('ControlOrMeta+a');
  await expect(page.locator('#top')).toHaveJSProperty('values', ['mozzarella', 'feta', 'olives', 'peppers']);
  await expect(list.getByRole('option', { name: 'Olives' })).toHaveAttribute('aria-selected', 'true');
});

test('groups are named groups', async ({ page }) => {
  await expect(box(page, 'Toppings').getByRole('group', { name: 'Vegetables' })).toBeVisible();
});

test('horizontal uses Left and Right', async ({ page }) => {
  const list = box(page, 'Size');
  await expect(list).toHaveAttribute('aria-orientation', 'horizontal');
  await list.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#size')).toHaveJSProperty('value', 'l');
});

test('form gets one entry per selected value; change fires; reset restores', async ({ page }) => {
  await page.evaluate(() => {
    window.__changes = 0;
    document.querySelector('#top').addEventListener('change', () => (window.__changes += 1));
  });
  await box(page, 'Toppings').getByRole('option', { name: 'Feta' }).click();
  await box(page, 'Toppings').getByRole('option', { name: 'Olives' }).click();
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.locator('#out')).toContainText('["top","feta"],["top","olives"]');
  expect(await page.evaluate(() => window.__changes)).toBe(2);
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.locator('#top')).toHaveJSProperty('values', []);
});

for (const theme of THEMES)
  test(`axe-clean in the ${theme} theme`, async ({ page }) => {
    await gotoInTheme(page, '/listbox.html', theme, 'focsd-listbox');
    await expectAxeClean(page);
  });

// Beyond the brief: edges from earlier wave-14 reviews.

/** A keydown for a character no keyboard layout in Playwright has (Playwright's press() rejects it). */
const typeKey = (page, key) =>
  page.evaluate(
    (k) =>
      document
        .querySelector('#ship')
        .shadowRoot.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, composed: true })),
    key,
  );

test('the active option does not wrap, and Ctrl/Meta+A again selects none', async ({ page }) => {
  await box(page, 'Toppings').focus();
  await page.keyboard.press('End');
  await page.keyboard.press('ArrowDown');
  expect(await active(page, 'Toppings')).toBe('Peppers');
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowUp');
  expect(await active(page, 'Toppings')).toBe('Mozzarella');
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('ControlOrMeta+a');
  await expect(page.locator('#top')).toHaveJSProperty('values', []);
});

test('multiple: arrows move without selecting; Shift+Space selects from the anchor', async ({ page }) => {
  await box(page, 'Toppings').focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#top')).toHaveJSProperty('values', ['feta']);
  await page.keyboard.press('Shift+Space');
  await expect(page.locator('#top')).toHaveJSProperty('values', ['feta', 'olives', 'peppers']);
});

test('right-to-left mirrors Left and Right', async ({ page }) => {
  await page.locator('#size').evaluate((el) => (el.dir = 'rtl'));
  await box(page, 'Size').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#size')).toHaveJSProperty('value', 'l');
});

test('typeahead ignores case and accents', async ({ page }) => {
  await page.locator('#ship').evaluate((el) => {
    el.insertAdjacentHTML(
      'beforeend',
      '<focsd-option value="eco">Économie</focsd-option><focsd-option value="lodz">Łódź</focsd-option><focsd-option value="tokyo">東京</focsd-option>',
    );
  });
  await expect(box(page, 'Shipping speed').getByRole('option')).toHaveCount(6);
  await box(page, 'Shipping speed').focus();
  await page.keyboard.press('e');
  await page.keyboard.press('e');
  expect(await active(page, 'Shipping speed')).toBe('Économie');
  await typeKey(page, 'ł');
  expect(await active(page, 'Shipping speed')).toBe('Łódź');
  await typeKey(page, '東');
  expect(await active(page, 'Shipping speed')).toBe('東京');
});

test('required with nothing chosen is valueMissing; choosing clears it', async ({ page }) => {
  const top = page.locator('#top');
  await top.evaluate((el) => (el.required = true));
  expect(await top.evaluate((el) => el.validity.valueMissing)).toBe(true);
  await expect(box(page, 'Toppings')).toHaveAttribute('aria-required', 'true');
  await box(page, 'Toppings').getByRole('option', { name: 'Feta' }).click();
  expect(await top.evaluate((el) => el.validity.valid)).toBe(true);
});

test('property writes coerce, never throw, and ignore unknown values', async ({ page }) => {
  const result = await page.locator('#top').evaluate((el) => {
    el.values = 'feta';
    const one = el.values;
    el.values = [5, 'olives', 'nope'];
    const mixed = el.values;
    el.values = null;
    const none = el.values;
    el.value = /** @type {any} */ (undefined);

    return { one, mixed, none, value: el.value };
  });

  expect(result).toEqual({ one: ['feta'], mixed: ['olives'], none: [], value: '' });

  const ship = await page.locator('#ship').evaluate((el) => {
    el.value = 'nope';
    const unknown = el.value;
    el.value = 'express';

    return [unknown, el.value, el.values];
  });

  expect(ship).toEqual(['', 'express', ['express']]);
});

test('reset brings back the value attribute and the option defaults, and clears the active option', async ({ page }) => {
  await page.locator('#top').evaluate((el) => el.querySelector('[value="peppers"]').setAttribute('selected', ''));
  await expect(page.locator('#top')).toHaveJSProperty('values', ['peppers']);
  await box(page, 'Shipping speed').focus();
  await page.keyboard.press('ArrowDown');
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.locator('#ship')).toHaveJSProperty('value', 'standard');
  await expect(page.locator('#top')).toHaveJSProperty('values', ['peppers']);
  expect(await box(page, 'Shipping speed').getAttribute('aria-activedescendant')).toBeNull();
});

test('state restore takes known values only', async ({ page }) => {
  const result = await page.locator('#top').evaluate((el) => {
    const data = new FormData();
    data.append('top', 'feta');
    data.append('top', 'bogus');
    el.formStateRestoreCallback(data);
    const multi = el.values;
    const ship = document.querySelector('#ship');
    ship.formStateRestoreCallback('bogus');

    return { multi, ship: ship.value };
  });

  expect(result).toEqual({ multi: ['feta'], ship: '' });
});

test('an author aria-label names the listbox; disabled is not focusable', async ({ page }) => {
  await page.locator('#size').evaluate((el) => el.setAttribute('aria-label', 'Pizza size'));
  await expect(box(page, 'Pizza size')).toBeVisible();
  await page.locator('#size').evaluate((el) => (el.disabled = true));
  await expect(box(page, 'Pizza size')).toHaveAttribute('aria-disabled', 'true');
  await expect(box(page, 'Pizza size')).toHaveAttribute('tabindex', '-1');
  await clickInert(box(page, 'Pizza size').getByRole('option', { name: 'Small' }));
  await expect(page.locator('#size')).toHaveJSProperty('value', 'm');
});

// Fix round 1.

test('editing an option label or text at run time re-renders the row', async ({ page }) => {
  await page.locator('#size').evaluate((el) => {
    el.querySelector('[value="s"]').textContent = 'Small (10 in)';
    el.querySelector('[value="l"]').innerHTML = '<b>Large</b> (14 in)';
  });
  await expect(box(page, 'Size').getByRole('option', { name: 'Small (10 in)' })).toBeVisible();
  await expect(box(page, 'Size').getByRole('option', { name: 'Large (14 in)' })).toBeVisible();
});

test('a group label set as a property re-renders the group', async ({ page }) => {
  await page.locator('#top').evaluate((el) => (el.querySelector('focsd-option-group').label = 'Cheeses'));
  await expect(box(page, 'Toppings').getByRole('group', { name: 'Cheeses' })).toBeVisible();
});

test('single: Space is handled, so it does not scroll the page', async ({ page }) => {
  await page.evaluate(() => {
    window.__spacePrevented = null;
    window.addEventListener('keydown', (e) => {
      if (e.key === ' ') window.__spacePrevented = e.defaultPrevented;
    });
  });
  await box(page, 'Shipping speed').focus();
  await page.keyboard.press('Space');
  expect(await page.evaluate(() => window.__spacePrevented)).toBe(true);
  await expect(page.locator('#ship')).toHaveJSProperty('value', 'standard');
});

test('a disabled listbox focused by a click shows no active option', async ({ page }) => {
  await page.locator('#ship').evaluate((el) => (el.disabled = true));
  await clickInert(box(page, 'Shipping speed').getByRole('option', { name: 'Express (2 days)' }));
  expect(await box(page, 'Shipping speed').getAttribute('aria-activedescendant')).toBeNull();
  await expect(box(page, 'Shipping speed').locator('[part~="active"]')).toHaveCount(0);
});

test('single: of several written values, the first written one is selected', async ({ page }) => {
  const value = await page.locator('#ship').evaluate((el) => {
    el.values = ['express', 'standard'];

    return el.value;
  });

  expect(value).toBe('express');
});

// 14a-10 M-7: Shift+arrow selects anchor..active, so moving back toward the anchor deselects.
test('Shift+arrow extends and shrinks the range from the anchor', async ({ page }) => {
  await box(page, 'Toppings').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Shift+ArrowDown');
  await expect(page.locator('#top')).toHaveJSProperty('values', ['mozzarella', 'feta', 'olives']);
  await page.keyboard.press('Shift+ArrowUp');
  await expect(page.locator('#top')).toHaveJSProperty('values', ['mozzarella', 'feta']);
});

test('typeahead reads several characters typed quickly', async ({ page }) => {
  await page.locator('#ship').evaluate(async (el) => {
    el.insertAdjacentHTML(
      'beforeend',
      '<focsd-option value="economy">Economy</focsd-option><focsd-option value="eco-plus">Eco Plus</focsd-option>',
    );
    await new Promise(requestAnimationFrame);
    await el.updateComplete;
  });
  await box(page, 'Shipping speed').focus();
  await page.keyboard.type('eco');
  expect(await active(page, 'Shipping speed')).toBe('Economy');
});

// 14a-10 M-8: the active option is kept by value when options are inserted before it.
test('inserting an option before the active one keeps the same option active', async ({ page }) => {
  await box(page, 'Shipping speed').focus();
  await page.keyboard.press('ArrowDown');
  expect(await active(page, 'Shipping speed')).toBe('Express (2 days)');
  await page.locator('#ship').evaluate(async (el) => {
    el.insertAdjacentHTML('afterbegin', '<focsd-option value="pickup">Store pickup</focsd-option>');
    await new Promise(requestAnimationFrame);
    await el.updateComplete;
  });
  await expect.poll(() => active(page, 'Shipping speed')).toBe('Express (2 days)');
});
