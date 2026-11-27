import AxeBuilder from '@axe-core/playwright';
import { expect, test, host as invoicesHost } from './fixtures/test.js';
import { openFromGridReviewFixes } from './fixtures/pages.js';
import { grid } from './fixtures/grid.js';
import { addThemeInitScript, expectTheme } from './fixtures/axe.js';
import { announcements, recordAnnouncements } from './fixtures/announcements.js';

// Scan settled states only (no transitions mid-flight).
test.use({ contextOptions: { reducedMotion: 'reduce' } });

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const scan = async (page, label) => {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(results.violations.map((v) => `${label} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
};

for (const theme of ['light', 'dark', 'contrast']) {
  test(`data grid has no WCAG 2.2 AA violations in every state (${theme})`, async ({ page }) => {
    test.setTimeout(150000);
    await addThemeInitScript(page, theme);
    await page.goto('/grid.html');
    await expectTheme(page, theme);
    await page.waitForFunction(() => Boolean(customElements.get('focsd-data-grid')));
    const host = page.locator('#invoices');
    const header = (name) => host.getByRole('columnheader', { name: new RegExp(`^${name}`) });
    await scan(page, 'base');

    await header('Amount').getByRole('button', { name: 'Column options for Amount' }).click();
    await host.getByRole('menu').waitFor();
    await scan(page, 'menu');
    await host.getByRole('menuitem', { name: 'Filter…' }).click();
    await host.getByRole('dialog', { name: 'Filter Amount' }).waitFor();
    await scan(page, 'filter');
    await host.getByRole('dialog', { name: 'Filter Amount' }).getByRole('textbox', { name: 'Value' }).fill('x');
    await host.getByRole('button', { name: 'Apply' }).click();
    await scan(page, 'filter error');
    await page.keyboard.press('Escape');

    await host.getByRole('button', { name: 'Columns' }).click();
    await host.getByRole('dialog', { name: 'Columns' }).waitFor();
    await scan(page, 'panel');
    await page.keyboard.press('Escape');

    await host.getByRole('combobox', { name: 'Group by' }).selectOption('region');
    await host.getByRole('treegrid', { name: 'Invoices' }).waitFor();
    await host.locator('[role="row"][aria-expanded]').first().locator('[part~="group-toggle"]').click();
    await scan(page, 'grouped');
    await host.getByRole('combobox', { name: 'Group by' }).selectOption('');

    await host.getByRole('grid', { name: 'Invoices' }).getByRole('gridcell', { name: 'Northwind' }).first().click();
    await page.keyboard.press('Enter');
    await host.getByRole('textbox', { name: 'Edit Customer' }).fill('');
    await page.keyboard.press('Enter');
    await expect(host.getByRole('textbox', { name: 'Edit Customer' })).toHaveAttribute('aria-invalid', 'true');
    await scan(page, 'editing');
  });
}

// Re-homed from grid-review-fixes.spec.js (Q48).

test('Clear search and filters announces the cleared search to server-mode apps', async ({ page }) => {
  await openFromGridReviewFixes(page);
  await invoicesHost(page).evaluate((el) => {
    window.__events = [];
    el.addEventListener('focsd-search-change', (e) => window.__events.push(e.detail.quickSearch));
  });
  await invoicesHost(page).getByRole('searchbox', { name: 'Search Invoices' }).fill('zzz');
  await invoicesHost(page).getByRole('button', { name: 'Clear search and filters' }).click();
  expect((await page.evaluate(() => window.__events)).at(-1)).toBe('');
});

test('the same message twice is announced twice', async ({ page }) => {
  // The grid announces through the shared document announcer (B14).
  await recordAnnouncements(page);
  await openFromGridReviewFixes(page);

  for (const value of ['Acme', 'Acme Two']) {
    await grid(page).getByRole('gridcell', { name: 'Northwind' }).first().click();
    await page.keyboard.press('Enter');
    await invoicesHost(page).getByRole('textbox', { name: 'Edit Customer' }).fill(value);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Enter');
    await invoicesHost(page).getByRole('textbox', { name: 'Edit Customer' }).fill(value);
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-focsd-announcer="polite"]')).toHaveText('Saved');
  }

  expect((await announcements(page)).filter((a) => a.text === 'Saved')).toHaveLength(2);
});
