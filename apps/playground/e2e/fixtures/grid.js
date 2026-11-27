/**
 * The invoices data grid on `/grid.html`, as the grid specs reach it.
 */

/** @typedef {import('@playwright/test').Page} Page */

/**
 * The grid by role and name.
 * @param {Page} page
 */
export const grid = (page) => page.getByRole('grid', { name: 'Invoices' });

/**
 * The column header whose name starts with `name`.
 * @param {Page} page
 * @param {string} name
 */
export const header = (page, name) => grid(page).getByRole('columnheader', { name: new RegExp(`^${name}`) });

/**
 * The page's polite announcer region.
 * @param {Page} page
 */
export const announced = (page) => page.locator('[data-focsd-announcer="polite"]');
