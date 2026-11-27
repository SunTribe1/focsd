import { expect, test } from './fixtures/test.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/data.html');
  await page.waitForFunction(() =>
    [
      'focsd-table',
      'focsd-data-grid',
      'focsd-tree',
      'focsd-timeline',
      'focsd-empty-state',
      'focsd-code',
      'focsd-image',
      'focsd-scroll-area',
      'focsd-splitter',
      'focsd-carousel',
    ].every((t) => customElements.get(t)),
  );
});

test('table: captioned table, sortable headers with aria-sort, focusable scroll region', async ({ page }) => {
  const table = page.getByRole('table', { name: 'Members' });
  await expect(table).toBeVisible();
  // The region is a tab stop only when it scrolls (see polish-data.spec.js); this one fits.
  const region = page.getByRole('region', { name: 'Members' });
  expect(await region.evaluate((el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)).toBe(false);
  await expect(region).not.toHaveAttribute('tabindex');
  const nameHeader = page.getByRole('columnheader', { name: 'Name' });
  await expect(nameHeader).toHaveAttribute('aria-sort', 'none');
  await page.getByRole('button', { name: 'Name' }).click();
  await expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
  await expect(table.getByRole('row').nth(1)).toContainText('Amara Okafor');
  await page.getByRole('button', { name: 'Name' }).click();
  await expect(nameHeader).toHaveAttribute('aria-sort', 'descending');
  await expect(table.getByRole('row').nth(1)).toContainText('Priya Raman');
});

test('data grid: grid role with counts, roving cell focus and keyboard', async ({ page }) => {
  const grid = page.getByRole('grid', { name: 'Invoices' });
  await expect(grid).toHaveAttribute('aria-rowcount', '24');
  const firstCell = grid.getByRole('gridcell', { name: 'INV-001', exact: true });
  await firstCell.click();
  await expect(firstCell).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(grid.getByRole('gridcell', { name: 'Northwind' }).first()).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(grid.getByRole('gridcell', { name: 'Contoso' }).first()).toBeFocused();
  await page.keyboard.press('End');
  await expect(grid.getByRole('gridcell', { name: 'Paid' }).first()).toBeFocused();

  const tabStops = await page
    .locator('#grid')
    .evaluate((el) => el.shadowRoot.querySelectorAll('[role="gridcell"][tabindex="0"], [role="columnheader"][tabindex="0"]').length);

  expect(tabStops).toBe(1);
});

test('data grid: paging, selection, sort and filter', async ({ page }) => {
  const grid = page.getByRole('grid', { name: 'Invoices' });
  await page.getByRole('navigation', { name: 'Invoices pages' }).getByRole('button', { name: 'Page 2' }).click();
  await expect(grid.getByRole('gridcell', { name: 'INV-006', exact: true })).toBeVisible();
  await grid.getByRole('checkbox', { name: 'Select row INV-006' }).check();
  await expect(page.locator('#grid-selected')).toHaveText('1');
  await expect(grid.getByRole('row', { name: /INV-006/ })).toHaveAttribute('aria-selected', 'true');
  await grid
    .getByRole('columnheader', { name: /^Amount/ })
    .getByText('Amount')
    .click();
  await expect(grid.getByRole('columnheader', { name: /^Amount/ })).toHaveAttribute('aria-sort', 'ascending');
  await page.getByRole('searchbox', { name: 'Search Invoices' }).fill('Tailspin');
  await expect(grid).toHaveAttribute('aria-rowcount', '5');
  await page.getByRole('searchbox', { name: 'Search Invoices' }).fill('');
  await expect(grid).toHaveAttribute('aria-rowcount', '24');
});

test('tree: treeitems with levels and expansion; arrow keys follow APG', async ({ page }) => {
  const src = page.getByRole('treeitem', { name: 'src' });
  await expect(page.getByRole('tree', { name: 'Project files' })).toBeVisible();
  await expect(src).toHaveAttribute('aria-expanded', 'true');
  await expect(src).toHaveAttribute('aria-level', '1');
  await src.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('treeitem', { name: 'index.js' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  const comps = page.getByRole('treeitem', { name: 'components' });
  await expect(comps).toBeFocused();
  await expect(comps).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('ArrowRight');
  await expect(comps).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('treeitem', { name: 'button.js' })).toBeFocused();
  await expect(page.getByRole('treeitem', { name: 'button.js' })).toHaveAttribute('aria-level', '3');
  await page.keyboard.press('ArrowLeft');
  await expect(comps).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#tree-result')).toHaveText('src/components');
  await page.keyboard.press('End');
  await expect(page.getByRole('treeitem', { name: 'README.md' })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(src).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(src).toHaveAttribute('aria-expanded', 'false');
});

test('timeline, empty state and code block semantics', async ({ page }) => {
  await expect(page.locator('#tl')).toMatchAriaSnapshot(`
    - list:
      - listitem:
        - time: /Oct 1, 2026|1 Oct 2026/
        - text: Project created Amara created Atlas.
      - listitem:
        - time: /Oct 3, 2026|3 Oct 2026/
        - text: Invoice paid Payment received.
  `);
  await expect(page.getByRole('heading', { name: 'No reports yet', level: 2 })).toBeVisible();
  const code = page.getByRole('region', { name: 'Install command' });
  await expect(code).toHaveAttribute('tabindex', '0');
  // Headless Chromium refuses clipboard writes without a grant, and a refused write is "Copy failed" (R25).
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.resolve() } }),
  );
  await page.getByRole('button', { name: 'Copy code' }).click();
  await expect(page.locator('#code').getByRole('status')).toHaveText('Copied');
});

test('image: broken image shows a named fallback; decorative image is hidden', async ({ page }) => {
  await expect(page.getByRole('img', { name: 'Team offsite in Lisbon' })).toBeVisible();
  await expect(page.locator('#img-deco').getByRole('img')).toHaveCount(0);
});

test('scroll area is a focusable labelled region', async ({ page }) => {
  const region = page.getByRole('region', { name: 'Release notes' });
  await expect(region).toHaveAttribute('tabindex', '0');

  const scrollable = await page.locator('#sa').evaluate((el) => {
    const r = el.shadowRoot.querySelector('[part~="viewport"]');

    return r.scrollHeight > r.clientHeight;
  });

  expect(scrollable).toBe(true);
});

test('splitter: focusable separator with value; keys resize; Enter collapses', async ({ page }) => {
  const sep = page.getByRole('separator', { name: 'Resize file list' });
  await expect(sep).toHaveAttribute('aria-valuenow', '40');
  await sep.focus();
  await page.keyboard.press('ArrowRight');
  await expect(sep).toHaveAttribute('aria-valuenow', '41');
  await page.keyboard.press('Shift+ArrowRight');
  await expect(sep).toHaveAttribute('aria-valuenow', '51');
  await page.keyboard.press('Home');
  await expect(sep).toHaveAttribute('aria-valuenow', '10');
  await page.keyboard.press('Enter');
  await expect(sep).toHaveAttribute('aria-valuenow', '0');
  await page.keyboard.press('Enter');
  await expect(sep).toHaveAttribute('aria-valuenow', '10');
});

test('carousel: labelled region, slides named n of N, next/previous; hidden slides inert', async ({ page }) => {
  const region = page.getByRole('region', { name: 'Featured templates' });
  await expect(region).toHaveAttribute('aria-roledescription', 'carousel');
  await expect(page.getByRole('group', { name: '1 of 3' })).toBeVisible();
  await page.getByRole('button', { name: 'Next slide' }).click();
  await expect(page.getByRole('group', { name: '2 of 3' })).toBeVisible();
  await expect(page.locator('#car focsd-carousel-slide').first()).toHaveAttribute('inert', '');
  await page.getByRole('button', { name: 'Previous slide' }).click();
  await expect(page.getByRole('group', { name: '1 of 3' })).toBeVisible();
});
