import { expect, test } from './fixtures/test.js';
import { openFromReviewFixes4 } from './fixtures/pages.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/grid.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-data-grid')));
});

const grid = (page, name = 'Invoices') => page.getByRole('grid', { name });

const focusedCell = (page, host = '#invoices') =>
  page.locator(host).evaluate((el) => {
    const a = el.shadowRoot.activeElement;
    const cell = a?.closest('[role="gridcell"], [role="columnheader"]');

    return cell
      ? {
          row: cell.closest('[role="row"]').getAttribute('aria-rowindex'),
          col: cell.getAttribute('aria-colindex'),
          text: cell.textContent.trim(),
        }
      : null;
  });

test('semantics: labelled grid with row/column counts and indices', async ({ page }) => {
  const g = grid(page);
  await expect(g).toHaveAttribute('aria-rowcount', '65');
  await expect(g).toHaveAttribute('aria-colcount', '10');
  await expect(g.getByRole('row')).toHaveCount(11);
  await expect(g.getByRole('row').nth(1)).toHaveAttribute('aria-rowindex', '2');
  await expect(g.getByRole('gridcell', { name: '1001', exact: true })).toHaveAttribute('aria-colindex', '2');
  await expect(g.getByRole('columnheader', { name: /^Customer/ })).toHaveAttribute('aria-colindex', '3');
  await page.locator('#invoices').getByRole('button', { name: 'Page 2', exact: true }).click();
  await expect(g.getByRole('row').nth(1)).toHaveAttribute('aria-rowindex', '12');
  await expect(g.getByRole('gridcell', { name: '1011', exact: true })).toBeVisible();
});

test('keyboard: one tab stop; arrows, Home/End, Ctrl+Home/End move the active cell', async ({ page }) => {
  const g = grid(page);
  await g.getByRole('gridcell', { name: '1001', exact: true }).click();
  expect(await focusedCell(page)).toMatchObject({ row: '2', col: '2', text: '1001' });
  expect(await page.locator('#invoices').evaluate((el) => el.shadowRoot.querySelectorAll('[role="grid"] [tabindex="0"]').length)).toBe(1);
  await page.keyboard.press('ArrowRight');
  expect(await focusedCell(page)).toMatchObject({ row: '2', col: '3', text: 'Northwind' });
  await page.keyboard.press('ArrowDown');
  expect(await focusedCell(page)).toMatchObject({ row: '3', col: '3', text: 'Contoso' });
  await page.keyboard.press('End');
  expect(await focusedCell(page)).toMatchObject({ row: '3', col: '10' });
  await page.keyboard.press('Home');
  expect(await focusedCell(page)).toMatchObject({ row: '3', col: '1' });
  await page.keyboard.press('ControlOrMeta+End');
  expect(await focusedCell(page)).toMatchObject({ row: '11', col: '10' });
  await page.keyboard.press('ControlOrMeta+Home');
  expect(await focusedCell(page)).toMatchObject({ row: '1', col: '1' });
});

test('pinned columns stay put while the grid scrolls sideways', async ({ page }) => {
  const g = grid(page);
  const pinnedStart = g.getByRole('gridcell', { name: '1001', exact: true });
  const pinnedEnd = g.getByRole('row').nth(1).locator('[role="gridcell"]').last();
  const before = [await pinnedStart.boundingBox(), await pinnedEnd.boundingBox()];
  await page.locator('#invoices').evaluate((el) => {
    el.shadowRoot.querySelector('[role="grid"]').scrollLeft = 400;
  });
  await expect.poll(async () => Math.round((await pinnedStart.boundingBox()).x)).toBe(Math.round(before[0].x));
  expect(Math.round((await pinnedEnd.boundingBox()).x)).toBe(Math.round(before[1].x));
  expect(await page.locator('#invoices').evaluate((el) => el.shadowRoot.querySelector('[role="grid"]').scrollLeft)).toBeGreaterThan(0);
});

test('windowed: 5,000 rows render a window yet keyboard reaches every row', async ({ page }) => {
  const g = grid(page, 'Large dataset');
  await expect(g).toHaveAttribute('aria-rowcount', '5001');
  expect(await g.getByRole('row').count()).toBeLessThan(80);
  await g.getByRole('gridcell', { name: 'Item 1', exact: true }).click();

  for (let i = 0; i < 30; i += 1) await page.keyboard.press('ArrowDown');
  expect(await focusedCell(page, '#big')).toMatchObject({ row: '32', text: 'Item 31' });
  await page.keyboard.press('ControlOrMeta+End');
  expect(await focusedCell(page, '#big')).toMatchObject({ row: '5001' });
  await page.keyboard.press('ControlOrMeta+Home');
  expect(await focusedCell(page, '#big')).toMatchObject({ row: '1' });
});

test('selection: checkbox, Shift range, Space, Ctrl+A, mixed header state and announcements', async ({ page }) => {
  const g = grid(page);
  await g.getByRole('checkbox', { name: 'Select row 1001' }).check();
  await expect(g.getByRole('row').nth(1)).toHaveAttribute('aria-selected', 'true');
  await g.getByRole('checkbox', { name: 'Select row 1003' }).click({ modifiers: ['Shift'] });
  await expect(page.locator('#invoices-selected')).toHaveText('3');
  const all = g.getByRole('checkbox', { name: 'Select all rows' });
  await expect(all).toHaveJSProperty('indeterminate', true);
  await g.getByRole('gridcell', { name: 'Contoso' }).first().click();
  await page.keyboard.press('Space');
  await expect(page.locator('#invoices-selected')).toHaveText('2');
  await expect(g.getByRole('row').nth(2)).toHaveAttribute('aria-selected', 'false');
  await page.keyboard.press('Space');
  await expect(page.locator('#invoices-selected')).toHaveText('3');
  await page.keyboard.press('ControlOrMeta+a');
  await expect(page.locator('#invoices-selected')).toHaveText('64');
  await expect(page.locator('[data-focsd-announcer="polite"]')).toHaveText('64 rows selected');
  await expect(all).toBeChecked();
});

test('focus survives when the focused row disappears', async ({ page }) => {
  const g = grid(page);
  await g.getByRole('gridcell', { name: '1003', exact: true }).click();
  await page.locator('#invoices').evaluate((el) => {
    el.rows = el.rows.filter((r) => r.id !== 1003);
  });
  await expect.poll(() => focusedCell(page)).toMatchObject({ row: '4', text: '1004' });
});

test('Enter on a read-only cell fires focsd-row-activate', async ({ page }) => {
  await grid(page).getByRole('gridcell', { name: 'Amara Okafor' }).first().click();
  await page.keyboard.press('Enter');
  await expect(page.locator('#invoices-event')).toHaveText('focsd-row-activate');
});

// Re-homed from review-fixes-4.spec.js (Q48).

/** Append a grid with `count` rows (r1..rN) and return its id. */
const addGrid = (page, options) =>
  page.evaluate(
    ({ count, pageSize, selectable, dupes }) => {
      const big = document.createElement('focsd-data-grid');
      big.id = 'big';
      big.label = 'Big';
      big.setAttribute('page-size', String(pageSize));
      big.selection = selectable ? 'multiple' : 'none';
      big.columns = ['name', 'a', 'b', 'c', 'd', 'e'].map((id) => ({ id, header: id.toUpperCase() }));
      big.rows = Array.from({ length: count }, (_, i) => ({
        name: dupes ? 'Same' : `r${i + 1}`,
        a: i,
        b: `b${i % 7}`,
        c: i * 3,
        d: `d${i}`,
        e: i % 2,
      }));
      document.getElementById('pg-main').prepend(big);

      return big.updateComplete;
    },
    { selectable: false, dupes: false, ...options },
  );

test('a sorted, filtered 2,000-row grid re-renders fast', async ({ page }) => {
  await openFromReviewFixes4(page);
  await addGrid(page, { count: 2000, pageSize: 10, selectable: true });

  const ms = await page.locator('#big').evaluate(async (big) => {
    big.sortBy('name');
    await big.updateComplete;
    const t = performance.now();
    big.setSearch('1');
    await big.updateComplete;
    big.setSearch('');
    await big.updateComplete;

    return performance.now() - t;
  });

  expect(ms).toBeLessThan(500);
});

test('windowed mode keeps keyboard focus moving row by row, and Ctrl+End reaches the last row', async ({ page }) => {
  await openFromReviewFixes4(page);
  await addGrid(page, { count: 500, pageSize: 0 });
  const big = page.getByRole('grid', { name: 'Big' });
  await big.getByRole('gridcell', { name: 'r1', exact: true }).click();

  for (let i = 0; i < 30; i += 1) await page.keyboard.press('ArrowDown');
  await expect(big.getByRole('gridcell', { name: 'r31', exact: true })).toBeFocused();
  await page.keyboard.press('ControlOrMeta+End');

  const focused = await page
    .locator('#big')
    .evaluate((el) => el.shadowRoot.activeElement?.closest('[role=row]')?.getAttribute('aria-rowindex'));

  expect(focused).toBe('501');
  await page.keyboard.press('ControlOrMeta+Home');
  await expect(big.getByRole('columnheader', { name: 'NAME' })).toBeFocused();
});

test('filtering from code keeps exactly one tab stop', async ({ page }) => {
  await openFromReviewFixes4(page);
  await addGrid(page, { count: 30, pageSize: 10 });
  const stops = () => page.locator('#big').evaluate((el) => el.shadowRoot.querySelectorAll('[tabindex="0"]').length);
  await page.getByRole('grid', { name: 'Big' }).getByRole('gridcell', { name: 'r9', exact: true }).click();
  await page.locator('#big').evaluate((el) => {
    el.setSearch('zzz');

    return el.updateComplete;
  });
  expect(await stops()).toBe(1);
  await page.locator('#big').evaluate((el) => {
    el.setSearch('');
    el.columns = el.columns.slice(0, 2);

    return el.updateComplete;
  });
  expect(await stops()).toBe(1);
});

test('no-results state keeps aria-rowcount consistent and announces the empty state', async ({ page }) => {
  await openFromReviewFixes4(page);
  await addGrid(page, { count: 30, pageSize: 10 });
  await page.locator('#big').evaluate((el) => {
    el.setSearch('zzz');

    return el.updateComplete;
  });
  const big = page.getByRole('grid', { name: 'Big' });
  const rows = await big.getByRole('row').count();
  await expect(big).toHaveAttribute('aria-rowcount', String(rows));
  await expect(page.locator('#big').getByText('No rows match.')).toBeVisible();
});

test('rows with duplicate first-column values are selected individually', async ({ page }) => {
  await openFromReviewFixes4(page);
  await addGrid(page, { count: 5, pageSize: 10, selectable: true, dupes: true });
  const big = page.getByRole('grid', { name: 'Big' });
  await big.getByRole('checkbox', { name: 'Select row Same' }).nth(1).check();
  expect(await page.locator('#big').evaluate((el) => el.selectedIds.length)).toBe(1);
  await expect(big.locator('[role=row][aria-selected="true"]')).toHaveCount(1);
});
