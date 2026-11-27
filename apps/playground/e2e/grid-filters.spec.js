import { expect, test, host } from './fixtures/test.js';
import { grid, header } from './fixtures/grid.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/grid.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-data-grid')));
});

const columnTexts = (page, colIndex) =>
  host(page).evaluate(
    (el, col) =>
      [...el.shadowRoot.querySelectorAll('[part~="body"] [role="row"]')].map((r) =>
        r.querySelector(`[aria-colindex="${col}"]`).textContent.trim(),
      ),
    colIndex,
  );

const openFilter = async (page, name) => {
  await header(page, name)
    .getByRole('button', { name: `Column options for ${name}` })
    .click();
  await host(page).getByRole('menuitem', { name: 'Filter…' }).click();

  return host(page).getByRole('dialog', { name: `Filter ${name}` });
};

test('quick search filters across columns and reports the count', async ({ page }) => {
  const search = host(page).getByRole('searchbox', { name: 'Search Invoices' });
  await search.fill('contoso');
  await expect.poll(() => columnTexts(page, 3)).toEqual(Array.from({ length: 9 }, () => 'Contoso'));
  await expect(host(page).getByText('Rows 1–9 of 9 (filtered from 64)')).toBeVisible();
  await expect(page.locator('[data-focsd-announcer="polite"]')).toHaveText('9 of 64 rows');
  await expect(page.locator('#invoices-event')).toHaveText('focsd-search-change');
});

test('number filter from the column menu: condition, value, chip, header state', async ({ page }) => {
  const dialog = await openFilter(page, 'Amount');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('combobox', { name: 'Condition' }).selectOption('gt');
  await dialog.getByRole('textbox', { name: 'Value' }).fill('5000');
  await dialog.getByRole('button', { name: 'Apply' }).click();
  await expect(dialog).toBeHidden();
  const amounts = (await columnTexts(page, 5)).map((t) => Number(t.replaceAll(/[€,]/g, '')));
  expect(amounts.length).toBeGreaterThan(0);
  expect(amounts.every((a) => a > 5000)).toBe(true);
  await expect(host(page).getByRole('button', { name: 'Remove filter: Amount > €5,000.00' })).toBeVisible();
  await expect(header(page, 'Amount')).toHaveAccessibleName(/filtered/);
  await expect(page.locator('[data-focsd-announcer="polite"]')).toHaveText(/^Filter applied: Amount > €5,000.00\. \d+ of 64 rows$/);
  await expect(page.locator('#invoices-event')).toHaveText('focsd-filter-change');
  await expect(header(page, 'Amount')).toBeFocused();
});

test('invalid values show an error and are not applied', async ({ page }) => {
  const dialog = await openFilter(page, 'Amount');
  await dialog.getByRole('textbox', { name: 'Value' }).fill('lots');
  await dialog.getByRole('button', { name: 'Apply' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Enter a number.');
  await expect(dialog.getByRole('textbox', { name: 'Value' })).toHaveAttribute('aria-invalid', 'true');
  await expect(host(page).getByRole('button', { name: /^Remove filter/ })).toHaveCount(0);
});

test('enum filter is a searchable checklist', async ({ page }) => {
  const dialog = await openFilter(page, 'Region');
  await dialog.getByRole('searchbox', { name: 'Search values' }).fill('asia');
  await expect(dialog.getByRole('checkbox', { name: 'Europe' })).toHaveCount(0);
  // Keyboard path (WebKit does not focus checkboxes on click).
  await dialog.getByRole('checkbox', { name: 'Asia Pacific' }).focus();
  await page.keyboard.press('Space');
  await expect(dialog.getByRole('checkbox', { name: 'Asia Pacific' })).toBeChecked();
  await page.keyboard.press('Enter');
  await expect.poll(() => columnTexts(page, 4)).toEqual(Array.from({ length: 10 }, () => 'Asia Pacific'));
  await expect(host(page).getByRole('button', { name: 'Remove filter: Region is Asia Pacific' })).toBeVisible();
});

test('date between filter and boolean filter combine', async ({ page }) => {
  let dialog = await openFilter(page, 'Due');
  await dialog.getByRole('combobox', { name: 'Condition' }).selectOption('between');
  await dialog.getByLabel('From').fill('2026-03-01');
  await dialog.getByLabel('To').fill('2026-03-31');
  await dialog.getByRole('button', { name: 'Apply' }).click();
  const dues = await columnTexts(page, 6);
  expect(dues.length).toBeGreaterThan(0);
  expect(dues.every((d) => d.startsWith('Mar'))).toBe(true);
  dialog = await openFilter(page, 'Paid');
  await dialog.getByRole('combobox', { name: 'Condition' }).selectOption('isTrue');
  await dialog.getByRole('button', { name: 'Apply' }).click();
  expect((await columnTexts(page, 7)).every((p) => p === 'Yes')).toBe(true);
  await expect(host(page).getByRole('button', { name: /^Remove filter/ })).toHaveCount(2);
});

test('chips remove one filter; Clear all removes every filter; empty state offers a reset', async ({ page }) => {
  let dialog = await openFilter(page, 'Amount');
  await dialog.getByRole('combobox', { name: 'Condition' }).selectOption('gt');
  await dialog.getByRole('textbox', { name: 'Value' }).fill('5000');
  await dialog.getByRole('button', { name: 'Apply' }).click();
  dialog = await openFilter(page, 'Customer');
  await dialog.getByRole('textbox', { name: 'Value' }).fill('nord');
  await dialog.getByRole('button', { name: 'Apply' }).click();
  await host(page).getByRole('button', { name: 'Remove filter: Customer contains nord' }).click();
  await expect(host(page).getByRole('button', { name: /^Remove filter/ })).toHaveCount(1);
  await host(page).getByRole('button', { name: 'Clear all filters' }).click();
  await expect(host(page).getByRole('button', { name: /^Remove filter/ })).toHaveCount(0);
  await host(page).getByRole('searchbox', { name: 'Search Invoices' }).fill('zzz');
  await expect(host(page).getByText('No rows match.')).toBeVisible();
  await host(page).getByRole('button', { name: 'Clear search and filters' }).click();
  await expect(grid(page).getByRole('row')).toHaveCount(11);
});

test('column panel shows, hides and reorders columns', async ({ page }) => {
  await host(page).getByRole('button', { name: 'Columns' }).click();
  const panel = host(page).getByRole('dialog', { name: 'Columns' });
  await expect(panel).toBeVisible();
  await panel.getByRole('checkbox', { name: 'Owner' }).uncheck();
  await expect(header(page, 'Owner')).toHaveCount(0);
  await panel.getByRole('button', { name: 'Move Paid up' }).click();

  const labels = await host(page).evaluate((el) =>
    [...el.shadowRoot.querySelectorAll('[part~="header-label"]')].map((n) => n.textContent.trim()),
  );

  expect(labels.indexOf('Paid')).toBe(labels.indexOf('Due') - 1);
  await expect(panel.getByRole('button', { name: 'Move Paid up' })).toBeFocused();
  await panel.getByRole('button', { name: 'Show all' }).click();
  await expect(header(page, 'Owner')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(host(page).getByRole('button', { name: 'Columns' })).toBeFocused();
});

test('column panel keeps focus on the move button when a column id has CSS-special characters', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.evaluate(() => {
    const el = document.createElement('focsd-data-grid');
    el.id = 'quoted';
    el.label = 'Quoted';
    el.toolbar = true;
    el.columns = [
      { id: 'first', header: 'First' },
      { id: 'say "hi" \\ there', header: 'Greeting' },
    ];
    el.rows = [{ first: 'a', 'say "hi" \\ there': 'b' }];
    document.querySelector('main').append(el);
  });
  const quoted = page.locator('#quoted');
  await quoted.getByRole('button', { name: 'Columns' }).click();
  const panel = quoted.getByRole('dialog', { name: 'Columns' });
  await panel.getByRole('button', { name: 'Move Greeting up' }).click();
  // Greeting is now first, so "up" is disabled and focus moves to its "down" partner.
  await expect(panel.getByRole('button', { name: 'Move Greeting down' })).toBeFocused();
  expect(errors).toEqual([]);
});
