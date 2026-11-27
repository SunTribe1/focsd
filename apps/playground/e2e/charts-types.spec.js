import { expect, test, host as chart } from './fixtures/test.js';

// Wave 18b: area, stacked bar, scatter and `mirror` keep the contract of bar, line and donut
// (charts.spec.js): a named figure with a referenced summary, named points in one tab stop, arrow
// keys, the two-tone ring for keyboard focus only, and a table with every value.

test.beforeEach(async ({ page }) => {
  await page.goto('/charts.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-chart')));
  await page.evaluate(() => Promise.all([...document.querySelectorAll('focsd-chart')].map((c) => c.updateComplete)));
});

const summary = (page, id) => page.evaluate((i) => document.getElementById(i).summary, id);
const focusedName = (page, id) => chart(page, id).evaluate((el) => el.shadowRoot.activeElement?.getAttribute('aria-label'));

const SUMMARIES = {
  area: 'Area chart, 6 categories, 3 series. Highest: Online, Jun, $4,100.',
  'stacked-area': 'Stacked area chart, 6 categories, 3 series. Highest total: Jun, $6,850.',
  stacked: 'Stacked bar chart, 4 categories, 2 series. Highest total: Q4, $3,400.',
  scatter: 'Scatter chart, 2 series, 11 points. x from 10 to 85, y from 42 ms to 170 ms.',
};

for (const [id, text] of Object.entries(SUMMARIES)) {
  test(`${id}: a named figure whose summary is referenced`, async ({ page }) => {
    expect(await summary(page, id)).toBe(text);
    const group = chart(page, id).locator('[part~="chart"]');
    await expect(group).toHaveAccessibleDescription(text);
    const label = await chart(page, id).getAttribute('label');
    await expect(group).toHaveAccessibleName(label);
    const stops = await chart(page, id).evaluate((el) => el.shadowRoot.querySelectorAll('[part~="point"][tabindex="0"]').length);
    expect(stops).toBe(1);
  });
}

test('area: markers are named as in a line chart, over a fill drawn with attributes', async ({ page }) => {
  await expect(chart(page, 'area').getByRole('img', { name: 'Stores, Mar: $1,500' })).toHaveCount(1);

  const fills = await chart(page, 'area').evaluate((el) =>
    [...el.shadowRoot.querySelectorAll('.area')].map((a) => [a.getAttribute('fill-opacity'), a.hasAttribute('style')]),
  );

  expect(fills).toEqual([
    ['0.24', false],
    ['0.24', false],
    ['0.24', false],
  ]);
  await expect(chart(page, 'area').locator('[part~="legend"] li')).toHaveText(['Online', 'Stores', 'Partners']);
});

test('area: arrows move as in a line chart', async ({ page }) => {
  await chart(page, 'area').getByRole('img', { name: 'Online, Jan: $2,100' }).focus();
  await page.keyboard.press('ArrowRight');
  expect(await focusedName(page, 'area')).toBe('Online, Feb: $2,400');
  await page.keyboard.press('ArrowDown');
  expect(await focusedName(page, 'area')).toBe('Stores, Feb: $1,300');
  await page.keyboard.press('End');
  expect(await focusedName(page, 'area')).toBe('Stores, Jun: $1,800');
});

test('stacked bars: segments carry their total, Up/Down walk one category, negatives stack below zero', async ({ page }) => {
  await chart(page, 'stacked').getByRole('img', { name: 'Online, Q2: $1,500 of $2,450' }).focus();
  await page.keyboard.press('ArrowDown');
  expect(await focusedName(page, 'stacked')).toBe('Stores, Q2: $950 of $2,450');
  await page.keyboard.press('ArrowUp');
  expect(await focusedName(page, 'stacked')).toBe('Online, Q2: $1,500 of $2,450');

  const [online, stores, negative] = await chart(page, 'stacked').evaluate((el) =>
    ['[data-s="0"][data-r="1"]', '[data-s="1"][data-r="1"]', '[data-s="1"][data-r="2"]'].map((sel) => {
      const b = el.shadowRoot.querySelector(sel).getBoundingClientRect();

      return { top: b.top, bottom: b.bottom, left: b.left, width: b.width };
    }),
  );
  // One bar per category: the segments share x, the second sits on the first.

  // Compare centres: Firefox counts the focused segment's stroke in its box, so the left edges differ by the stroke.
  expect(stores.left + stores.width / 2).toBeCloseTo(online.left + online.width / 2, 0);
  expect(stores.bottom).toBeLessThanOrEqual(online.top + 1.5);
  const zero = await chart(page, 'stacked').evaluate((el) => el.shadowRoot.querySelector('.baseline').getBoundingClientRect().top);
  expect(negative.top).toBeGreaterThanOrEqual(zero - 1.5);
});

test('stacked bars: the table adds a Total column', async ({ page }) => {
  await chart(page, 'stacked').getByRole('button', { name: 'Show data table' }).click();
  const table = chart(page, 'stacked').getByRole('table', { name: 'Revenue by quarter, stacked' });
  await expect(table.getByRole('columnheader')).toHaveText(['quarter', 'Online', 'Stores', 'Total']);
  await expect(table.getByRole('row', { name: /Q3/ }).getByRole('cell')).toHaveText(['$1,700', '-$300', '$1,400']);
});

test('scatter: points named by x and y, arrows follow x within a series', async ({ page }) => {
  await expect(chart(page, 'scatter').getByRole('img')).toHaveCount(11);
  await chart(page, 'scatter').getByRole('img', { name: 'API, x: 10, y: 42 ms' }).focus();
  await page.keyboard.press('ArrowRight');
  expect(await focusedName(page, 'scatter')).toBe('API, x: 25, y: 47 ms');
  await page.keyboard.press('ArrowDown');
  expect(await focusedName(page, 'scatter')).toBe('Web, x: 25, y: 95 ms');
  await page.keyboard.press('ArrowRight');
  expect(await focusedName(page, 'scatter')).toBe('Web, x: 55, y: 120 ms');
  await page.keyboard.press('End');
  expect(await focusedName(page, 'scatter')).toBe('Web, x: 85, y: 170 ms');
  await page.keyboard.press('Home');
  expect(await focusedName(page, 'scatter')).toBe('Web, x: 10, y: 88 ms');
});

test('scatter: the table lists series, x and y for every point', async ({ page }) => {
  await chart(page, 'scatter').getByRole('button', { name: 'Show data table' }).click();
  const table = chart(page, 'scatter').getByRole('table', { name: 'Response time by load' });
  await expect(table.getByRole('columnheader')).toHaveText(['Series', 'load', 'y']);
  await expect(table.getByRole('rowheader')).toHaveCount(11);
  await expect(table.getByRole('row').nth(11).getByRole('cell')).toHaveText(['85', '170 ms']);
});

test('the focus ring shows for keyboard focus only, on every new type', async ({ page }) => {
  for (const id of ['area', 'stacked', 'scatter', 'mirrored']) {
    const ring = chart(page, id).locator('[part~="focus-ring"]');
    await chart(page, id).locator('[part~="point"][tabindex="0"]').click();
    await expect(ring).toBeHidden();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
    await expect(ring).toBeVisible();
  }
});

test('mirror: categories run right to left, Left/Right follow them, values sit on the right', async ({ page }) => {
  const x = (id, s, r) =>
    chart(page, id).evaluate(
      (el, [si, ri]) => el.shadowRoot.querySelector(`[data-s="${si}"][data-r="${ri}"]`).getBoundingClientRect().left,
      [s, r],
    );

  expect(await x('mirrored', 0, 1)).toBeLessThan(await x('mirrored', 0, 0));
  await chart(page, 'mirrored').locator('[data-s="0"][data-r="0"]').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(chart(page, 'mirrored').locator('[data-s="0"][data-r="1"]')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(chart(page, 'mirrored').locator('[data-s="0"][data-r="0"]')).toBeFocused();
  await page.keyboard.press('End');
  await expect(chart(page, 'mirrored').locator('[data-s="0"][data-r="3"]')).toBeFocused();

  const [labels, plot] = await chart(page, 'mirrored').evaluate((el) => {
    const left = (n) => n.getBoundingClientRect().left;

    return [
      Math.min(...[...el.shadowRoot.querySelectorAll('.axis.grid text')].map(left)),
      Math.max(...[...el.shadowRoot.querySelectorAll('[part~="point"]')].map((p) => p.getBoundingClientRect().right)),
    ];
  });

  expect(labels).toBeGreaterThan(plot);
});

test('mirror off: the same chart keeps the plot left to right in a right-to-left page', async ({ page }) => {
  await chart(page, 'mirrored').evaluate((el) => {
    el.mirror = false;

    return el.updateComplete;
  });
  await chart(page, 'mirrored').locator('[data-s="0"][data-r="0"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(chart(page, 'mirrored').locator('[data-s="0"][data-r="1"]')).toBeFocused();
});

test('in a right-to-left page the caption, legend, table and tooltip follow dir', async ({ page }) => {
  const el = chart(page, 'mirrored');
  await el.getByRole('button').click();
  await el.locator('[data-s="0"][data-r="0"]').focus();

  const dirs = await el.evaluate((c) =>
    ['caption', 'legend', 'table', 'tooltip'].map((p) => getComputedStyle(c.shadowRoot.querySelector(`[part~="${p}"]`)).direction),
  );

  expect(dirs).toEqual(['rtl', 'rtl', 'rtl', 'rtl']);
});

test('forced colors: area, line and scatter marks draw in system colors', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit does not emulate forced colors');
  await page.emulateMedia({ forcedColors: 'active' });
  const text = await page.evaluate(() => getComputedStyle(document.body).color);

  const paint = (id, selector, prop) =>
    chart(page, id).evaluate((el, [sel, p]) => getComputedStyle(el.shadowRoot.querySelector(sel))[p], [selector, prop]);

  expect(await paint('area', '.line', 'stroke')).toBe(text);
  expect(await paint('area', '.area', 'fill')).toBe(text);
  expect(Number(await paint('area', '.area', 'fillOpacity'))).toBeLessThan(0.24);
  expect(await paint('scatter', '.marker', 'stroke')).toBe(text);
  expect(await paint('scatter', '.marker', 'fill')).toBe(text);
});

test('area: the table lists every value', async ({ page }) => {
  await chart(page, 'area').getByRole('button', { name: 'Show data table' }).click();
  const table = chart(page, 'area').getByRole('table');
  await expect(table.getByRole('rowheader')).toHaveCount(6);
  await expect(table.getByRole('cell')).toHaveCount(18);
});

for (const id of ['area', 'scatter']) {
  test(`${id}: with mirror, Left moves toward the left of the plot and Right back`, async ({ page }) => {
    const el = chart(page, id);
    await el.evaluate((node) => {
      const chartEl = node;
      chartEl.mirror = true;

      return chartEl.updateComplete;
    });
    const point = el.locator('[part~="point"][tabindex="0"]');
    const left = () => el.evaluate((c) => c.shadowRoot.activeElement.getBoundingClientRect().left);

    await point.focus();
    const start = await left();
    await page.keyboard.press('ArrowLeft');
    const moved = await left();
    expect(moved).toBeLessThan(start);
    await page.keyboard.press('ArrowRight');
    expect(await left()).toBeCloseTo(start, 0);
  });
}

test('browser shortcuts pass through: Alt, Ctrl and Meta with arrows or Home are not swallowed', async ({ page }) => {
  const el = chart(page, 'area');
  await el.locator('[part~="point"][tabindex="0"]').focus();

  const results = await el.evaluate((c) => {
    const point = c.shadowRoot.activeElement;

    const press = (init) => {
      const event = new KeyboardEvent('keydown', { bubbles: true, composed: true, cancelable: true, ...init });
      point.dispatchEvent(event);

      return event.defaultPrevented;
    };

    return {
      plain: press({ key: 'ArrowRight' }),
      alt: press({ key: 'ArrowRight', altKey: true }),
      ctrl: press({ key: 'Home', ctrlKey: true }),
      meta: press({ key: 'ArrowLeft', metaKey: true }),
    };
  });

  expect(results).toEqual({ plain: true, alt: false, ctrl: false, meta: false });
});
