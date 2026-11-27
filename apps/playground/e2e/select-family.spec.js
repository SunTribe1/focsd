import { expect, test } from './fixtures/test.js';
import { clickInert } from './fixtures/dom.js';
import AxeBuilder from '@axe-core/playwright';

// One option model across focsd-select, focsd-combobox and focsd-multi-select: groups, multiple, type-ahead
// or filtering, clear, select all and a maximum.

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test.beforeEach(async ({ page }) => {
  await page.goto('/selects.html');
  await page.waitForFunction(() =>
    ['focsd-select', 'focsd-combobox', 'focsd-multi-select', 'focsd-option-group'].every((t) => customElements.get(t)),
  );
});

const host = (page, id) => page.locator(`#${id}`);
const trigger = (page, id) => page.locator(`#${id} [part~="trigger"]`);
const value = (page, id) => host(page, id).evaluate((el) => el.value);
const formData = (page, name) => page.locator('#sf').evaluate((form, n) => new FormData(form).getAll(n), name);
const listbox = (page, id) => host(page, id).getByRole('listbox');

// ---- focsd-select ---------------------------------------------------------------------------------

test.describe('focsd-select', () => {
  test('groups are named groups inside the listbox', async ({ page }) => {
    await trigger(page, 's-group').click();
    const europe = host(page, 's-group').getByRole('group', { name: 'Europe' });
    await expect(europe).toBeVisible();
    await expect(europe.getByRole('option')).toHaveCount(3);
    await expect(host(page, 's-group').getByRole('group', { name: 'Americas' }).getByRole('option', { name: 'Toronto' })).toBeVisible();
  });

  test('arrow keys and type-ahead cross groups and skip disabled options and groups', async ({ page }) => {
    await trigger(page, 's-group').focus();
    await page.keyboard.press('ArrowDown');
    await expect(host(page, 's-group').getByRole('option', { name: 'Berlin' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(host(page, 's-group').getByRole('option', { name: 'Paris' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(host(page, 's-group').getByRole('option', { name: 'New York' })).toBeFocused();
    await page.keyboard.press('End');
    await expect(host(page, 's-group').getByRole('option', { name: 'Toronto' })).toBeFocused();
    await page.keyboard.press('s'); // Sydney is in a disabled group
    await expect(host(page, 's-group').getByRole('option', { name: 'Toronto' })).toBeFocused();
    await page.keyboard.press('p');
    await expect(host(page, 's-group').getByRole('option', { name: 'Paris' })).toBeFocused();
    await expect(host(page, 's-group').getByRole('option', { name: 'Sydney' })).toHaveAttribute('aria-disabled', 'true');
    await page.keyboard.press('Enter');
    expect(await value(page, 's-group')).toBe('par');
  });

  test('searchable: a filter box narrows options and hides empty groups', async ({ page }) => {
    await trigger(page, 's-multi').click();
    const search = host(page, 's-multi').getByRole('searchbox', { name: 'Filter Cities' });
    await expect(search).toBeFocused();
    await search.fill('to');
    await expect(host(page, 's-multi').getByRole('option', { name: 'Toronto' })).toBeVisible();
    await expect(host(page, 's-multi').getByRole('option', { name: 'Berlin' })).toBeHidden();
    await expect(host(page, 's-multi').getByRole('group', { name: 'Europe' })).toBeHidden();
    await page.keyboard.press('ArrowDown');
    await expect(host(page, 's-multi').getByRole('option', { name: 'Toronto' })).toBeFocused();
    await page.keyboard.press('Enter');
    expect(await formData(page, 'cities')).toEqual(['tor']);
  });

  test('multiple with select all respects the maximum', async ({ page }) => {
    await trigger(page, 's-multi').click();
    const all = host(page, 's-multi').getByRole('button', { name: 'Select all' });
    await all.click();
    expect(await formData(page, 'cities')).toEqual(['ber', 'par', 'rom']);
    await expect(host(page, 's-multi').getByRole('option', { name: 'New York' })).toHaveAttribute('aria-disabled', 'true');
    await clickInert(host(page, 's-multi').getByRole('option', { name: 'New York' }));
    expect(await formData(page, 'cities')).toEqual(['ber', 'par', 'rom']);
    await expect(host(page, 's-multi').locator('[part~="status"]')).toContainText('3');
    await host(page, 's-multi').getByRole('option', { name: 'Paris' }).click();
    await host(page, 's-multi').getByRole('option', { name: 'New York' }).click();
    expect(await formData(page, 'cities')).toEqual(['ber', 'rom', 'nyc']);
    await expect(host(page, 's-multi').getByRole('button', { name: 'Deselect all' })).toBeVisible();
    await host(page, 's-multi').getByRole('button', { name: 'Deselect all' }).click();
    expect(await formData(page, 'cities')).toEqual([]);
  });

  test('clearable: the clear button empties the selection and returns focus to the trigger', async ({ page }) => {
    const clear = host(page, 's-clear').getByRole('button', { name: 'Clear Size' });
    await expect(clear).toBeHidden();
    await trigger(page, 's-clear').click();
    await host(page, 's-clear').getByRole('option', { name: 'Medium' }).click();
    await expect(clear).toBeVisible();
    await clear.click();
    expect(await value(page, 's-clear')).toBe('');
    await expect(trigger(page, 's-clear')).toBeFocused();
    await expect(clear).toBeHidden();
  });
});

// ---- focsd-combobox -------------------------------------------------------------------------------

test.describe('focsd-combobox', () => {
  test('groups render as named groups and hide when nothing in them matches', async ({ page }) => {
    const input = page.getByRole('combobox', { name: 'Airport' });
    await input.click();
    await expect(listbox(page, 'c-group').getByRole('group', { name: 'Germany' })).toBeVisible();
    await expect(listbox(page, 'c-group').getByRole('group', { name: 'France' }).getByRole('option')).toHaveCount(2);
    await input.fill('ni');
    await expect(listbox(page, 'c-group').getByRole('group', { name: 'Germany' })).toHaveCount(1); // Munich
    await input.fill('nice');
    await expect(listbox(page, 'c-group').getByRole('group', { name: 'Germany' })).toHaveCount(0);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    expect(await value(page, 'c-group')).toBe('nce');
  });

  test('clearable clears the value and the text', async ({ page }) => {
    const input = page.getByRole('combobox', { name: 'Airport' });
    await input.fill('mun');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await host(page, 'c-group').getByRole('button', { name: 'Clear Airport' }).click();
    expect(await value(page, 'c-group')).toBe('');
    await expect(input).toHaveValue('');
    await expect(input).toBeFocused();
  });

  test('multiple: options toggle, show as tags, and stop at the maximum', async ({ page }) => {
    const input = page.getByRole('combobox', { name: 'Languages' });
    await input.click();
    await expect(listbox(page, 'c-multi')).toHaveAttribute('aria-multiselectable', 'true');
    await listbox(page, 'c-multi').getByRole('option', { name: 'German' }).click();
    await listbox(page, 'c-multi').getByRole('option', { name: 'French' }).click();
    expect(await formData(page, 'langs')).toEqual(['de', 'fr']);
    await expect(host(page, 'c-multi').getByRole('button', { name: 'Remove German' })).toBeVisible();
    await expect(listbox(page, 'c-multi').getByRole('option', { name: 'Spanish' })).toHaveAttribute('aria-disabled', 'true');
    await clickInert(listbox(page, 'c-multi').getByRole('option', { name: 'Spanish' }));
    expect(await formData(page, 'langs')).toEqual(['de', 'fr']);
    await host(page, 'c-multi').getByRole('button', { name: 'Clear Languages' }).click();
    expect(await formData(page, 'langs')).toEqual([]);
  });

  test('select all picks the matching options up to the maximum', async ({ page }) => {
    const input = page.getByRole('combobox', { name: 'Languages' });
    await input.fill('an'); // German, French, Spanish
    // Focus stays in the input, so Select all is the first row of the list.
    await listbox(page, 'c-multi').getByRole('option', { name: 'Select all' }).click();
    expect(await formData(page, 'langs')).toEqual(['de', 'es']);
  });

  test('focsd-multi-select is the multiple combobox, with groups', async ({ page }) => {
    expect(await host(page, 'ms-group').evaluate((el) => el.multiple)).toBe(true);
    const input = page.getByRole('combobox', { name: 'Labels' });
    await input.click();
    await expect(listbox(page, 'ms-group').getByRole('group', { name: 'Priority' }).getByRole('option', { name: 'Urgent' })).toBeVisible();
    await listbox(page, 'ms-group').getByRole('option', { name: 'Urgent' }).click();
    await listbox(page, 'ms-group').getByRole('option', { name: 'Bug' }).click();
    expect(await formData(page, 'labels')).toEqual(['p1', 'bug']);
  });
});

test('no WCAG 2.2 AA violations with lists open', async ({ page }) => {
  await trigger(page, 's-multi').click();
  await host(page, 's-multi').getByRole('button', { name: 'Select all' }).click();
  let results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  await page.keyboard.press('Escape');
  await page.getByRole('combobox', { name: 'Languages' }).click();
  results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
});
