import { expect, test, host } from './fixtures/test.js';
import { openFromGridReviewFixes } from './fixtures/pages.js';
import { grid, header } from './fixtures/grid.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/grid.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-data-grid')));
});

/** The x offset of an inset box-shadow on the first element matching `part`, as a sign (-1, 0, 1). */
const shadowSide = (page, part) =>
  host(page).evaluate((el, p) => {
    const cell = el.shadowRoot.querySelector(`[part~="${p}"]`);
    // Computed form: "rgb(…) -1px 0px 0px 0px inset" — the first length is the x offset.
    const x = Number.parseFloat(/\)\s+(-?[\d.]+)px/.exec(getComputedStyle(cell).boxShadow)?.[1] ?? 'NaN');

    return Math.sign(x);
  }, part);

test('Q16: pinned-column dividers sit on the scrolling side in LTR and RTL', async ({ page }) => {
  // inset with a negative x draws on the right edge, positive on the left.
  expect(await shadowSide(page, 'pinned-start-edge')).toBe(-1);
  expect(await shadowSide(page, 'pinned-end-edge')).toBe(1);
  await host(page).evaluate((el) => el.setAttribute('dir', 'rtl'));
  expect(await shadowSide(page, 'pinned-start-edge')).toBe(1);
  expect(await shadowSide(page, 'pinned-end-edge')).toBe(-1);
});

const openMenu = (page, name) =>
  header(page, name)
    .getByRole('button', { name: `Column options for ${name}` })
    .click();

/** Every open grid popup stays 8px inside a viewport of `width`. */
const expectInside = async (box, width) => {
  expect(box.x).toBeGreaterThanOrEqual(8 - 0.5);
  expect(box.x + box.width).toBeLessThanOrEqual(width - 8 + 0.5);
};

test('Q36: column menu, filter and column panel stay inside a 360px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const name = 'Owner';
  await grid(page).evaluate((el) => (el.scrollLeft = el.scrollWidth));
  await openMenu(page, name);
  const menu = host(page).getByRole('menu', { name: `Column options for ${name}` });
  await expectInside(await menu.boundingBox(), 360);
  await host(page).getByRole('menuitem', { name: 'Filter…' }).click();
  const filter = host(page).getByRole('dialog', { name: `Filter ${name}` });
  await expectInside(await filter.boundingBox(), 360);
  await page.keyboard.press('Escape');
  await host(page).getByRole('button', { name: 'Columns' }).click();
  await expectInside(await host(page).getByRole('dialog', { name: 'Columns' }).boundingBox(), 360);
});

/** Per direction: the menu's start edge and its trigger's, the panel's end edge and its button's. */
const POPUP_EDGES = {
  // Left in LTR; the panel's right edge meets the button's.
  ltr: { menu: (t, m) => [m.x, t.x], panel: (c, p) => [p.x + p.width, c.x + c.width] },
  // Right in RTL; the panel's left edge meets the button's, kept inside the viewport gutter.
  rtl: { menu: (t, m) => [m.x + m.width, t.x + t.width], panel: (c, p) => [p.x, Math.max(8, c.x)] },
};

for (const [dir, edges] of Object.entries(POPUP_EDGES))
  test(`${dir}: popups line up with the start edge of their trigger; the column panel with its end`, async ({ page }) => {
    const name = 'Customer';
    const trigger = () => header(page, name).getByRole('button', { name: `Column options for ${name}` });
    const menu = () => host(page).getByRole('menu', { name: `Column options for ${name}` });
    const columns = () => host(page).getByRole('button', { name: 'Columns' });
    const panel = () => host(page).getByRole('dialog', { name: 'Columns' });

    await host(page).evaluate((el, d) => el.setAttribute('dir', d), dir);
    await openMenu(page, name);

    const [menuEdge, triggerEdge] = edges.menu(await trigger().boundingBox(), await menu().boundingBox()).map(Math.round);
    expect(menuEdge).toBe(triggerEdge);
    await page.keyboard.press('Escape');
    await columns().click();

    const [panelEdge, buttonEdge] = edges.panel(await columns().boundingBox(), await panel().boundingBox()).map(Math.round);
    expect(panelEdge).toBe(buttonEdge);
    await page.keyboard.press('Escape');
  });

// Re-homed from review-fixes-6.spec.js (Q48).

test('data grid selection column is no wider than its checkbox cell', async ({ page }) => {
  await page.goto('/data.html');
  await page.waitForFunction(() => customElements.get('focsd-data-grid'));

  const gap = await page.locator('#grid').evaluate((el) => {
    const headerRow = el.shadowRoot.querySelector('[part~="header-row"]');
    const [select, first] = headerRow.children;

    return first.getBoundingClientRect().left - select.getBoundingClientRect().right;
  });

  expect(gap).toBeLessThan(1);
});

// Re-homed from grid-review-fixes.spec.js (Q48).

test('WCAG 2.4.11: a focused cell is never hidden under pinned columns', async ({ page }) => {
  await openFromGridReviewFixes(page);
  await page.setViewportSize({ width: 700, height: 800 });
  await grid(page).getByRole('gridcell', { name: '1001', exact: true }).click();

  for (let i = 0; i < 8; i += 1) await page.keyboard.press('ArrowRight');

  for (let i = 0; i < 7; i += 1) {
    await page.keyboard.press('ArrowLeft');

    const covered = await host(page).evaluate((el) => {
      const a = el.shadowRoot.activeElement.getBoundingClientRect();
      const start = el.shadowRoot.querySelector('[role="row"][aria-rowindex="2"] [aria-colindex="2"]').getBoundingClientRect();
      const end = el.shadowRoot.querySelector('[role="row"][aria-rowindex="2"] [aria-colindex="10"]').getBoundingClientRect();
      const col = Number(el.shadowRoot.activeElement.getAttribute('aria-colindex'));

      return col > 2 && col < 10 && (a.left < start.right - 1 || a.right > end.left + 1);
    });

    expect(covered).toBe(false);
  }
});
