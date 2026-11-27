import { expect, test } from './fixtures/test.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/inputs.html');
  await page.waitForFunction(() => ['focsd-combobox', 'focsd-multi-select', 'focsd-command'].every((t) => customElements.get(t)));
});

test('combobox: filters as you type, arrows move via activedescendant, Enter selects', async ({ page }) => {
  const input = page.getByRole('combobox', { name: 'Country' });
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  await expect(input).toHaveAttribute('aria-autocomplete', 'list');
  await input.fill('g');
  const list = page.getByRole('listbox', { name: 'Country' });
  await expect(list).toBeVisible();
  await expect(list.getByRole('option')).toHaveText(['Germany', 'United Kingdom', 'Greece']);
  await expect(page.locator('#cb').locator('[part~="status"]')).toHaveText('3 results');
  await input.press('ArrowDown');
  const active = await input.getAttribute('aria-activedescendant');
  await expect(page.locator(`#cb >> internal:attr=[id="${active}"]`)).toHaveText('Germany');
  await expect(input).toBeFocused();
  await input.press('ArrowDown');
  await input.press('Enter');
  await expect(input).toHaveValue('United Kingdom');
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  expect(await page.locator('#cb').evaluate((el) => el.value)).toBe('gb');
});

test('combobox: Escape closes then clears; click selects', async ({ page }) => {
  const input = page.getByRole('combobox', { name: 'Country' });
  await input.fill('fr');
  await page.getByRole('option', { name: 'France' }).click();
  await expect(input).toHaveValue('France');
  await input.fill('xyz');
  await expect(page.locator('#cb').locator('[part~="status"]')).toHaveText('No results');
  await input.press('Escape');
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  await input.press('Escape');
  await expect(input).toHaveValue('');
});

test('multi-select: tags with remove buttons; Enter toggles; Backspace removes last; form gets every value', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Remove Bug' })).toBeVisible();
  const input = page.getByRole('combobox', { name: 'Labels' });
  await input.focus();
  await input.press('ArrowDown');
  await expect(page.getByRole('listbox', { name: 'Labels' })).toHaveAttribute('aria-multiselectable', 'true');
  await input.press('ArrowDown');
  await input.press('Enter');
  await expect(page.getByRole('button', { name: 'Remove Design' })).toBeVisible();
  await expect(page.getByRole('listbox', { name: 'Labels' })).toBeVisible();
  await input.press('Escape');
  await page.locator('#inputs-submit').click();
  await expect(page.locator('#inputs-result')).toHaveText(/"labels":\["bug","design"\]/);
  await input.focus();
  await input.press('Backspace');
  await expect(page.getByRole('button', { name: 'Remove Design' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Remove Bug' }).click();
  expect(await page.locator('#ms').evaluate((el) => el.value)).toBe('');
});

test('command palette: opens as a labelled modal, filters grouped commands, Enter runs and restores focus', async ({ page }) => {
  await page.getByRole('button', { name: 'Open command palette' }).focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Command palette' });
  await expect(dialog).toBeVisible();
  const input = page.getByRole('combobox', { name: 'Command palette' });
  await expect(input).toBeFocused();
  await expect(page.getByRole('group', { name: 'Projects' })).toBeVisible();
  await input.fill('invite');
  await expect(page.getByRole('option')).toHaveText(['Invite member']);
  await input.press('Enter');
  await expect(page.locator('#cmd-result')).toHaveText('invite');
  await expect(dialog).toBeHidden();
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('cmd-open');
});

test('command palette: matching ignores accents ("e" finds "é"); Home, End and an empty list', async ({ page }) => {
  await page.evaluate(() => {
    const item = document.createElement('focsd-command-item');
    item.setAttribute('value', 'cafe');
    item.textContent = 'Café settings';
    document.querySelector('#cmd')?.append(item);
  });
  await page.getByRole('button', { name: 'Open command palette' }).click();
  const input = page.getByRole('combobox', { name: 'Command palette' });
  await input.fill('cafe');
  await expect(page.getByRole('option')).toHaveText(['Café settings']);
  await input.fill('CAFÉ');
  await expect(page.getByRole('option')).toHaveText(['Café settings']);
  await input.fill('');
  await input.press('End');
  const last = await input.getAttribute('aria-activedescendant');
  await expect(page.locator(`#cmd >> internal:attr=[id="${last}"]`)).toHaveText('Café settings');
  await input.press('Home');
  const first = await input.getAttribute('aria-activedescendant');
  await expect(page.locator(`#cmd >> internal:attr=[id="${first}"]`)).toContainText('New project');
  await input.fill('zzz');
  await input.press('ArrowDown');
  await expect(page.getByRole('option')).toHaveCount(0);
  await input.fill('new');
  await expect(input).toHaveAttribute('aria-activedescendant', /.+/);
  await input.press('Enter');
  await expect(page.locator('#cmd-result')).toHaveText('new-project');
});

test('command palette: keyboard shortcut toggles it; arrows wrap', async ({ page }) => {
  await page.locator('body').click();
  await page.keyboard.press('ControlOrMeta+k');
  const input = page.getByRole('combobox', { name: 'Command palette' });
  await expect(input).toBeFocused();
  await input.press('ArrowUp');
  const active = await input.getAttribute('aria-activedescendant');
  await expect(page.locator(`#cmd >> internal:attr=[id="${active}"]`)).toHaveText('Toggle theme');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeHidden();
});
