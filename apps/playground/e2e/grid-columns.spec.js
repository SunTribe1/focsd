import { expect, test, host } from './fixtures/test.js';
import { openFromGridReviewFixes } from './fixtures/pages.js';
import { grid, header, announced } from './fixtures/grid.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/grid.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-data-grid')));
});

const firstColumnTexts = (page, colIndex) =>
  page
    .locator('#invoices')
    .evaluate(
      (el, col) =>
        [...el.shadowRoot.querySelectorAll(`[part~="body"] [role="row"]`)]
          .slice(0, 4)
          .map((r) => r.querySelector(`[aria-colindex="${col}"]`).textContent.trim()),
      colIndex,
    );

const headerLabels = (page) =>
  page
    .locator('#invoices')
    .evaluate((el) => [...el.shadowRoot.querySelectorAll('[part~="header-label"]')].map((n) => n.textContent.trim()));

test('clicking a header sorts ascending, descending, then off; announced; event fired', async ({ page }) => {
  await header(page, 'Amount').getByText('Amount').click();
  await expect(header(page, 'Amount')).toHaveAttribute('aria-sort', 'ascending');
  await expect(announced(page)).toHaveText('Sorted by Amount, ascending');
  await expect(page.locator('#invoices-event')).toHaveText('focsd-sort-change');
  expect(await firstColumnTexts(page, 5)).toEqual(['€422.00', '€447.00', '€472.00', '€799.00']);
  await header(page, 'Amount').getByText('Amount').click();
  await expect(header(page, 'Amount')).toHaveAttribute('aria-sort', 'descending');
  await header(page, 'Amount').getByText('Amount').click();
  await expect(header(page, 'Amount')).not.toHaveAttribute('aria-sort');
  await expect(announced(page)).toHaveText('Sort cleared');
});

test('Shift adds a secondary sort with a visible, announced priority', async ({ page }) => {
  await header(page, 'Region').getByText('Region').click();
  await header(page, 'Customer')
    .getByText('Customer')
    .click({ modifiers: ['Shift'] });
  await expect(header(page, 'Region')).toHaveAttribute('aria-sort', 'ascending');
  await expect(header(page, 'Customer')).not.toHaveAttribute('aria-sort');
  await expect(header(page, 'Customer')).toContainText('2');
  await expect(header(page, 'Customer')).toHaveAccessibleName(/Customer.*sorted ascending, priority 2/);
  expect(await firstColumnTexts(page, 4)).toEqual(['Europe', 'Europe', 'Europe', 'Europe']);
  expect(await firstColumnTexts(page, 3)).toEqual(['Adatum', 'Adatum', 'Adatum', 'Café Nord']);
});

test('keyboard: Enter sorts, Shift+Enter adds, Alt+ArrowDown opens the column menu', async ({ page }) => {
  await grid(page).getByRole('gridcell', { name: '1001', exact: true }).click();
  await page.keyboard.press('ControlOrMeta+Home');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(header(page, 'Customer')).toHaveAttribute('aria-sort', 'ascending');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Shift+Enter');
  await expect(header(page, 'Region')).toContainText('2');
  await page.keyboard.press('Alt+ArrowDown');
  const menu = page.locator('#invoices').getByRole('menu', { name: 'Column options for Region' });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(header(page, 'Region')).toBeFocused();
});

test('column menu hides a column and pins another; focus and announcements follow', async ({ page }) => {
  await header(page, 'Owner').getByRole('button', { name: 'Column options for Owner' }).click();
  await page.locator('#invoices').getByRole('menuitem', { name: 'Hide column' }).click();
  await expect(header(page, 'Owner')).toHaveCount(0);
  await expect(grid(page)).toHaveAttribute('aria-colcount', '9');
  await expect(announced(page)).toHaveText('Column Owner hidden');
  await expect(page.locator('#invoices-event')).toHaveText('focsd-column-change');
  await header(page, 'Due').getByRole('button', { name: 'Column options for Due' }).click();
  await page.locator('#invoices').getByRole('menuitem', { name: 'Pin to start' }).click();
  expect((await headerLabels(page)).slice(0, 2)).toEqual(['Invoice', 'Due']);
  await expect(header(page, 'Due')).toHaveCSS('position', 'sticky');
  await expect(announced(page)).toHaveText('Column Due pinned to start');
});

test('resize: menu widens by 16px; dragging the edge resizes; double-click autosizes', async ({ page }) => {
  const width = async () => Math.round((await header(page, 'Customer').boundingBox()).width);
  const start = await width();
  await header(page, 'Customer').getByRole('button', { name: 'Column options for Customer' }).click();
  await page.locator('#invoices').getByRole('menuitem', { name: 'Widen column' }).click();
  expect(await width()).toBe(start + 16);
  const box = await header(page, 'Customer').boundingBox();
  await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width + 48, box.y + box.height / 2, { steps: 4 });
  await page.mouse.up();
  expect(await width()).toBe(start + 16 + 50);
  const resized = await header(page, 'Customer').boundingBox();
  await page.mouse.move(resized.x + 20, resized.y + resized.height / 2);
  await page.mouse.dblclick(resized.x + resized.width - 3, resized.y + resized.height / 2);
  expect(await width()).toBeLessThan(start + 16 + 50);
});

test('dragging a header reorders columns', async ({ page }) => {
  const from = await header(page, 'Region').boundingBox();
  const to = await header(page, 'Customer').boundingBox();
  await page.mouse.move(from.x + 20, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + 8, to.y + to.height / 2, { steps: 6 });
  await page.mouse.up();
  expect((await headerLabels(page)).slice(0, 3)).toEqual(['Invoice', 'Region', 'Customer']);
  await expect(header(page, 'Region')).not.toHaveAttribute('aria-sort');
});

// Re-homed from grid-review-fixes.spec.js (Q48).

test('a cancelled header drag leaves no listener behind', async ({ page }) => {
  await openFromGridReviewFixes(page);
  const order = () => host(page).evaluate((el) => el.getState().columnState.order.join(','));
  const before = await order();
  // A touch pan on a header: pointerdown, then pointercancel (no pointerup ever arrives).
  await host(page).evaluate((el) => {
    const cell = el.shadowRoot.querySelector('[data-col-id="customer"]');
    const r = cell.getBoundingClientRect();
    const init = { bubbles: true, composed: true, pointerId: 7, button: 0, clientX: r.left + 20, clientY: r.top + 10 };
    cell.dispatchEvent(new PointerEvent('pointerdown', init));
    cell.dispatchEvent(new PointerEvent('pointercancel', init));
  });
  const owner = await header(page, 'Owner').boundingBox();
  await page.mouse.move(owner.x + 30, owner.y + owner.height / 2, { steps: 4 });
  await page.mouse.click(owner.x + 30, owner.y + owner.height / 2);
  expect(await order()).toBe(before);
});

test('in RTL, dropping on the visual left half of a header lands after it', async ({ page }) => {
  await openFromGridReviewFixes(page);
  await host(page).evaluate((el) => el.setAttribute('dir', 'rtl'));
  const from = await header(page, 'Region').boundingBox();
  const to = await header(page, 'Amount').boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + 6, to.y + to.height / 2, { steps: 6 });
  await page.mouse.up();
  const order = await host(page).evaluate((el) => el.getState().columnState.order);
  expect(order.indexOf('region')).toBe(order.indexOf('amount') + 1);
});

test('column ids with spaces still name their headers', async ({ page }) => {
  await openFromGridReviewFixes(page);
  await host(page).evaluate(async (el) => {
    el.columns = [
      { id: 'first name', header: 'First name' },
      { id: 'last name', header: 'Last name' },
    ];
    el.rows = [{ id: 1, 'first name': 'Ada', 'last name': 'Lovelace' }];
    await el.updateComplete;
  });
  await expect(grid(page).getByRole('columnheader', { name: 'First name', exact: true })).toHaveCount(1);
});
