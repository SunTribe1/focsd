import { expect, test, host } from './fixtures/test.js';
import { openFromGridReviewFixes } from './fixtures/pages.js';
import { header } from './fixtures/grid.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/grid.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-data-grid')));
});

const headerLabels = (page) =>
  host(page).evaluate((el) => [...el.shadowRoot.querySelectorAll('[part~="header-label"]')].map((n) => n.textContent.trim()));

test('getState / setState round-trip sort, filters, columns and grouping; focsd-state-change is debounced', async ({ page }) => {
  await host(page).evaluate((el) => {
    window.__changes = 0;
    el.addEventListener('focsd-state-change', () => (window.__changes += 1));
  });

  const state = await host(page).evaluate(async (el) => {
    el.setState({
      sortModel: [{ colId: 'amount', direction: 'desc' }],
      filterModel: { region: { op: 'in', value: ['ap'] } },
      columnState: { order: ['id', 'region', 'customer'], hidden: { owner: true, notes: true }, pinned: { region: 'start' } },
      groupBy: [],
      density: 'compact',
    });
    await el.updateComplete;

    return el.getState();
  });

  expect(state.sortModel).toEqual([{ colId: 'amount', direction: 'desc' }]);
  expect(state.filterModel).toEqual({ region: { op: 'in', value: ['ap'] } });
  expect(state.density).toBe('compact');
  expect((await headerLabels(page)).slice(0, 3)).toEqual(['Invoice', 'Region', 'Customer']);
  expect(await headerLabels(page)).not.toContain('Owner');
  await expect.poll(() => page.evaluate(() => window.__changes)).toBe(1);
  await page.reload();
  await page.waitForFunction(() => Boolean(customElements.get('focsd-data-grid')));
  await host(page).evaluate(async (el, s) => {
    el.setState(JSON.parse(JSON.stringify(s)));
    await el.updateComplete;
  }, state);
  expect((await headerLabels(page)).slice(0, 3)).toEqual(['Invoice', 'Region', 'Customer']);
  await expect(host(page).getByRole('button', { name: 'Remove filter: Region is Asia Pacific' })).toBeVisible();
});

test('exportCsv exports the filtered, sorted, visible view; selectedOnly exports the selection', async ({ page }) => {
  const csv = await host(page).evaluate(async (el) => {
    el.setState({ filterModel: { region: { op: 'in', value: ['ap'] } }, columnState: { hidden: { notes: true, owner: true } } });
    await el.updateComplete;

    return el.exportCsv();
  });

  const lines = csv.split('\r\n');
  expect(lines[0]).toBe('Invoice,Customer,Region,Amount,Due,Paid,Status');
  expect(lines).toHaveLength(22);
  expect(lines.slice(1).every((l) => l.includes('Asia Pacific'))).toBe(true);

  const selected = await host(page).evaluate(async (el) => {
    el.setState({});
    await el.updateComplete;
    el.shadowRoot.querySelector('input[aria-label="Select row 1001"]').click();
    await el.updateComplete;

    return el.exportCsv({ selectedOnly: true, raw: true });
  });

  expect(selected.split('\r\n')).toHaveLength(2);
  expect(selected.split('\r\n')[1].startsWith('1001,Northwind,eu,')).toBe(true);
});

test('toolbar: Export CSV downloads a file; density toggle compacts rows', async ({ page }) => {
  const [download] = await Promise.all([page.waitForEvent('download'), host(page).getByRole('button', { name: 'Export CSV' }).click()]);
  expect(download.suggestedFilename()).toBe('Invoices.csv');

  const rowHeight = () =>
    host(page).evaluate((el) => el.shadowRoot.querySelector('[part~="body"] [role="row"]').getBoundingClientRect().height);

  const before = await rowHeight();
  const toggle = host(page).getByRole('button', { name: 'Compact rows' });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(await rowHeight()).toBeLessThan(before);
});

test('toolbar group picker groups by one column', async ({ page }) => {
  await host(page).getByRole('combobox', { name: 'Group by' }).selectOption('status');
  const treegrid = host(page).getByRole('treegrid', { name: 'Invoices' });
  await expect(treegrid).toBeVisible();
  // One collapsed header row per status, each with its row count (64 invoices in all).
  const groups = treegrid.locator('[role="row"][aria-level="1"]');
  await expect(groups).toHaveText([/Status: Draft \(22\)/, /Status: Sent \(21\)/, /Status: Overdue \(21\)/]);
  await expect(groups.and(page.locator('[aria-expanded="false"]'))).toHaveCount(3);
  await host(page).getByRole('combobox', { name: 'Group by' }).selectOption('');
  await expect(host(page).getByRole('grid', { name: 'Invoices' })).toBeVisible();
});

test('server mode: rows render as given, totals come from rowCount, interactions emit events', async ({ page }) => {
  await host(page).evaluate(async (el) => {
    window.__events = [];

    for (const t of ['focsd-sort-change', 'focsd-page-change', 'focsd-filter-change'])
      el.addEventListener(t, (e) => window.__events.push([t, JSON.stringify(e.detail)]));
    el.external = true;
    el.rowCount = 1000;
    el.rows = el.rows.slice(0, 10).reverse();
    await el.updateComplete;
  });
  const grid = host(page).getByRole('grid', { name: 'Invoices' });
  await expect(grid).toHaveAttribute('aria-rowcount', '1001');
  await expect(host(page).getByText('Rows 1–10 of 1000')).toBeVisible();
  await grid
    .getByRole('columnheader', { name: /^Invoice/ })
    .getByText('Invoice')
    .click();
  const firstId = () => grid.getByRole('row').nth(1).locator('[aria-colindex="2"]').textContent();
  expect((await firstId()).trim()).toBe('1010');
  await host(page).getByRole('button', { name: 'Page 2', exact: true }).click();
  const events = await page.evaluate(() => window.__events.map((e) => e[0]));
  expect(events).toEqual(['focsd-sort-change', 'focsd-page-change']);
  await expect(grid.getByRole('row').nth(1)).toHaveAttribute('aria-rowindex', '12');
});

test('loading state is announced and marks the grid busy', async ({ page }) => {
  await host(page).evaluate((el) => {
    el.loading = true;
  });
  await expect(host(page).getByRole('grid', { name: 'Invoices' })).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('[data-focsd-announcer="polite"]')).toHaveText('Loading rows');
});

test('startEditing and scrollToRow drive the grid from code', async ({ page }) => {
  await host(page).evaluate((el) => el.startEditing(1003, 'customer'));
  await expect(host(page).getByRole('textbox', { name: 'Edit Customer' })).toBeFocused();
  await page.keyboard.press('Escape');
  const big = page.locator('#big');
  await big.evaluate((el) => el.scrollToRow(4000));
  await expect(page.getByRole('grid', { name: 'Large dataset' }).getByRole('gridcell', { name: '4,000', exact: true })).toBeFocused();
});

test('methods work right after columns are set, before the first render', async ({ page }) => {
  await page.goto('/grid.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-data-grid')));

  const r = await page.evaluate(async () => {
    const errors = [];
    const grid = document.createElement('focsd-data-grid');
    grid.label = 'Fresh';
    grid.columns = [
      { id: 'name', header: 'Name' },
      { id: 'team', header: 'Team', groupable: true },
    ];
    grid.rows = [{ id: 1, name: 'Ada', team: 'R' }];

    try {
      grid.setGroupBy(['team', 'nope']);
      grid.sortBy('name');
    } catch (e) {
      errors.push(e.message);
    }

    document.body.append(grid);
    await grid.updateComplete;

    return { errors, groupBy: grid.getState().groupBy };
  });

  expect(r).toEqual({ errors: [], groupBy: ['team'] });
});

// Re-homed from grid-review-fixes.spec.js (Q48).

test('setState before the first render is applied once the grid renders', async ({ page }) => {
  await openFromGridReviewFixes(page);

  const labels = await page.evaluate(async () => {
    const g = document.createElement('focsd-data-grid');
    g.label = 'Late';
    g.columns = [
      { id: 'a', header: 'A' },
      { id: 'b', header: 'B' },
    ];
    g.rows = [{ id: 1, a: 'x', b: 'y' }];
    g.setState({ columnState: { order: ['b', 'a'] } });
    document.body.append(g);
    await g.updateComplete;

    return [...g.shadowRoot.querySelectorAll('[part~="header-label"]')].map((n) => n.textContent.trim());
  });

  expect(labels).toEqual(['B', 'A']);
});

test('server mode disables local grouping (it would group one page only)', async ({ page }) => {
  await openFromGridReviewFixes(page);
  await host(page).evaluate(async (el) => {
    el.external = true;
    el.rowCount = 1000;
    await el.updateComplete;
  });
  await expect(host(page).getByRole('combobox', { name: 'Group by' })).toHaveCount(0);
  await header(page, 'Region').getByRole('button', { name: 'Column options for Region' }).click();
  await expect(host(page).getByRole('menuitem', { name: 'Group by this column' })).toHaveCount(0);
});
