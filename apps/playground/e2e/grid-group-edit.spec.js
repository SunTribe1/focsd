import { expect, test, host } from './fixtures/test.js';
import { openFromMinorsMisc, openFromGridReviewFixes } from './fixtures/pages.js';
import { announced, grid as invoicesGrid } from './fixtures/grid.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/grid.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-data-grid')));
});

const header = (page, name) => host(page).getByRole('columnheader', { name: new RegExp(`^${name}`) });

const groupBy = async (page, name) => {
  await header(page, name)
    .getByRole('button', { name: `Column options for ${name}` })
    .click();
  await host(page).getByRole('menuitem', { name: 'Group by this column' }).click();
};

test('grouping turns the grid into a treegrid of collapsible group rows with aggregates', async ({ page }) => {
  await groupBy(page, 'Region');
  const tree = host(page).getByRole('treegrid', { name: 'Invoices' });
  await expect(tree).toBeVisible();
  await expect(announced(page)).toHaveText('Grouped by Region');
  await expect(page.locator('#invoices-event')).toHaveText('focsd-group-change');
  const groups = tree.locator('[role="row"][aria-expanded]');
  await expect(groups).toHaveCount(3);
  await expect(groups.first()).toHaveAttribute('aria-level', '1');
  await expect(groups.first()).toHaveAttribute('aria-expanded', 'false');
  await expect(groups.first()).toContainText('Europe (22)');
  await expect(groups.first()).toContainText('€');
});

test('Enter and arrows expand and collapse group rows; data rows sit one level deeper', async ({ page }) => {
  await groupBy(page, 'Region');
  const tree = host(page).getByRole('treegrid', { name: 'Invoices' });
  const europe = tree.locator('[role="row"][aria-expanded]').first();
  await europe.getByRole('gridcell').nth(1).click();
  await page.keyboard.press('Enter');
  await expect(europe).toHaveAttribute('aria-expanded', 'true');
  await expect(tree.locator('[role="row"][aria-level="2"]').first()).toBeVisible();
  await expect(announced(page)).toHaveText('Europe expanded');
  await page.keyboard.press('ArrowLeft');
  await expect(europe).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('ArrowRight');
  await expect(europe).toHaveAttribute('aria-expanded', 'true');
  await header(page, 'Region').getByRole('button', { name: 'Column options for Region' }).click();
  await host(page).getByRole('menuitem', { name: 'Ungroup' }).click();
  await expect(host(page).getByRole('grid', { name: 'Invoices' })).toBeVisible();
});

test('editing text: Enter edits, Enter saves and moves down; the edit event fires', async ({ page }) => {
  const grid = host(page).getByRole('grid', { name: 'Invoices' });
  await grid.getByRole('gridcell', { name: 'Northwind' }).first().click();
  await page.keyboard.press('Enter');
  const editor = host(page).getByRole('textbox', { name: 'Edit Customer' });
  await expect(editor).toBeFocused();
  await expect(editor).toHaveValue('Northwind');
  await editor.fill('Acme');
  await page.keyboard.press('Enter');
  await expect(grid.getByRole('gridcell', { name: 'Acme', exact: true })).toBeVisible();
  await expect(page.locator('#invoices-event')).toHaveText('focsd-cell-edit');
  await expect(announced(page)).toHaveText('Saved');
  await expect(grid.getByRole('gridcell', { name: 'Contoso' }).first()).toBeFocused();
});

test('Escape cancels; typing a character starts editing with that character', async ({ page }) => {
  const grid = host(page).getByRole('grid', { name: 'Invoices' });
  const cell = grid.getByRole('gridcell', { name: 'Northwind' }).first();
  await cell.click();
  await page.keyboard.press('F2');
  await page.keyboard.type('xyz');
  await page.keyboard.press('Escape');
  await expect(cell).toBeFocused();
  await expect(cell).toHaveText('Northwind');
  await page.keyboard.press('Z');
  await expect(host(page).getByRole('textbox', { name: 'Edit Customer' })).toHaveValue('Z');
  await page.keyboard.press('Escape');
});

test('invalid input keeps the editor open with an announced error', async ({ page }) => {
  const grid = host(page).getByRole('grid', { name: 'Invoices' });
  await grid.getByRole('row').nth(2).locator('[aria-colindex="5"]').click();
  await page.keyboard.press('Enter');
  const editor = host(page).getByRole('textbox', { name: 'Edit Amount' });
  await editor.fill('abc');
  await page.keyboard.press('Enter');
  await expect(editor).toBeFocused();
  await expect(editor).toHaveAttribute('aria-invalid', 'true');
  await expect(editor).toHaveAccessibleDescription('Enter a number.');
  await expect(announced(page)).toHaveText('Enter a number.');
  await editor.fill('250');
  await page.keyboard.press('Tab');
  await expect(grid.getByRole('row').nth(2).locator('[aria-colindex="5"]')).toHaveText('€250.00');
});

test('enum and boolean cells edit with a select', async ({ page }) => {
  const grid = host(page).getByRole('grid', { name: 'Invoices' });
  await grid.getByRole('row').nth(1).locator('[aria-colindex="4"]').click();
  await page.keyboard.press('Enter');
  await host(page).getByRole('combobox', { name: 'Edit Region' }).selectOption({ label: 'Americas' });
  await page.keyboard.press('Enter');
  await expect(grid.getByRole('row').nth(1).locator('[aria-colindex="4"]')).toHaveText('Americas');
  await grid.getByRole('row').nth(2).locator('[aria-colindex="7"]').click();
  await page.keyboard.press('Enter');
  await host(page).getByRole('combobox', { name: 'Edit Paid' }).selectOption({ label: 'Yes' });
  await page.keyboard.press('Enter');
  await expect(grid.getByRole('row').nth(2).locator('[aria-colindex="7"]')).toHaveText('Yes');
});

test('a cancelled focsd-cell-edit event leaves the value unchanged', async ({ page }) => {
  await host(page).evaluate((el) => el.addEventListener('focsd-cell-edit', (e) => e.preventDefault()));
  const grid = host(page).getByRole('grid', { name: 'Invoices' });
  await grid.getByRole('gridcell', { name: 'Northwind' }).first().click();
  await page.keyboard.press('Enter');
  await host(page).getByRole('textbox', { name: 'Edit Customer' }).fill('Acme');
  await page.keyboard.press('Enter');
  await expect(grid.getByRole('gridcell', { name: 'Acme', exact: true })).toHaveCount(0);
});

// Re-homed from minors-misc.spec.js (Q48).

test('Tab on the last column while editing moves to the first column of the next row', async ({ page }) => {
  await openFromMinorsMisc(page);
  await page.evaluate(async () => {
    const grid = document.createElement('focsd-data-grid');
    grid.id = 'tg';
    grid.label = 'Pairs';
    grid.columns = [
      { id: 'a', header: 'A', editable: true },
      { id: 'b', header: 'B', editable: true },
    ];
    grid.rows = [
      { id: 1, a: 'a1', b: 'b1' },
      { id: 2, a: 'a2', b: 'b2' },
    ];
    document.body.append(grid);
    await grid.updateComplete;
  });
  const grid = page.locator('#tg').getByRole('grid', { name: 'Pairs' });
  await grid.getByRole('row').nth(1).locator('[aria-colindex="2"]').click();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(grid.getByRole('row').nth(2).locator('[aria-colindex="1"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Shift+Tab');
  await expect(grid.getByRole('row').nth(1).locator('[aria-colindex="2"]')).toBeFocused();
});

// Re-homed from grid-review-fixes.spec.js (Q48).

const cellAt = (page, row, col) => invoicesGrid(page).getByRole('row').nth(row).locator(`[aria-colindex="${col}"]`);

test('editing a number in a comma-decimal locale saves the right value', async ({ page }) => {
  await openFromGridReviewFixes(page);
  await host(page).evaluate((el) => {
    el.locale = 'de-DE';
    window.__edits = [];
    el.addEventListener('focsd-cell-edit', (e) => window.__edits.push(e.detail.newValue));
  });
  await cellAt(page, 2, 5).click();
  await page.keyboard.press('Enter');
  await host(page).getByRole('textbox', { name: 'Edit Amount' }).fill('1,5');
  await page.keyboard.press('Enter');
  await expect(cellAt(page, 2, 5)).toHaveText('1,50 €');
  expect(await page.evaluate(() => window.__edits)).toEqual([1.5]);
});

test('date cells holding ISO datetimes and enums with numeric values are editable', async ({ page }) => {
  await openFromGridReviewFixes(page);
  await host(page).evaluate(async (el) => {
    el.columns = [
      { id: 'id', headerFromGridReviewFixes: 'Invoice', type: 'number' },
      { id: 'due', headerFromGridReviewFixes: 'Due', type: 'date', editable: true },
      {
        id: 'tier',
        headerFromGridReviewFixes: 'Tier',
        type: 'enum',
        editable: true,
        options: [
          { value: 1, label: 'One' },
          { value: 2, label: 'Two' },
        ],
      },
    ];
    el.rows = [{ id: 1, due: '2026-03-04T10:00:00Z', tier: 1 }];
    await el.updateComplete;
  });
  await cellAt(page, 1, 3).click();
  await page.keyboard.press('Enter');
  await expect(host(page).getByLabel('Edit Due')).toHaveValue('2026-03-04');
  await page.keyboard.press('Escape');
  await cellAt(page, 1, 4).click();
  await page.keyboard.press('Enter');
  await host(page).getByRole('combobox', { name: 'Edit Tier' }).selectOption({ label: 'Two' });
  await page.keyboard.press('Enter');
  await expect(cellAt(page, 1, 4)).toHaveText('Two');
});

test('grouped footer counts rows and groups honestly', async ({ page }) => {
  await openFromGridReviewFixes(page);
  await host(page).getByRole('combobox', { name: 'Group by' }).selectOption('region');
  await expect(host(page).locator('[part~="count"]')).toHaveText('64 rows in 3 groups');
});

const dropColumn = (page, id) =>
  page.evaluate((colId) => {
    const invoices = document.getElementById('invoices');
    invoices.columns = invoices.columns.filter((c) => c.id !== colId);
  }, id);

test('replacing the columns without the grouped one shows flat rows in a grid', async ({ page }) => {
  await groupBy(page, 'Region');
  await expect(host(page).getByRole('treegrid', { name: 'Invoices' })).toBeVisible();
  await dropColumn(page, 'region');
  const flat = host(page).getByRole('grid', { name: 'Invoices' });
  await expect(flat).toBeVisible();
  await expect(flat.locator('[role="row"][aria-expanded]')).toHaveCount(0);
  await expect(flat.getByRole('row').nth(1)).toContainText('Northwind');
  expect(await page.evaluate(() => document.getElementById('invoices').getState().groupBy)).toEqual([]);
});

test('replacing the columns without one of two grouped ones groups by the other', async ({ page }) => {
  await page.evaluate(() => document.getElementById('invoices').setGroupBy(['region', 'customer']));
  await dropColumn(page, 'region');
  const tree = host(page).getByRole('treegrid', { name: 'Invoices' });
  const groups = tree.locator('[role="row"][aria-expanded]');
  await expect(groups.first()).toHaveAttribute('aria-level', '1');
  await expect(groups).toHaveCount(7);
  expect(await page.evaluate(() => document.getElementById('invoices').getState().groupBy)).toEqual(['customer']);
});
