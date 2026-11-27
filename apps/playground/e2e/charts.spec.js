import { expect, test, host as chart } from './fixtures/test.js';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.goto('/charts.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-chart')));
  await page.evaluate(() => Promise.all([...document.querySelectorAll('focsd-chart')].map((c) => c.updateComplete)));
});

test('a named figure with a generated summary', async ({ page }) => {
  await expect(chart(page, 'bar').getByRole('group', { name: 'Revenue by quarter' })).toBeVisible();
  const summary = await page.evaluate(() => document.getElementById('bar').summary);
  expect(summary).toBe('Bar chart, 4 categories, 2 series. Highest: Online, Q4, $2,100.');
});

test('data points are one tab stop, named, and explored with the arrow keys', async ({ page }) => {
  const first = chart(page, 'bar').getByRole('img', { name: 'Online, Q1: $1,200' });
  await first.focus();
  await page.keyboard.press('ArrowRight');
  await expect(chart(page, 'bar').getByRole('img', { name: 'Online, Q2: $1,500' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(chart(page, 'bar').getByRole('img', { name: 'Stores, Q2: $950' })).toBeFocused();
  await page.keyboard.press('End');
  await expect(chart(page, 'bar').getByRole('img', { name: 'Stores, Q4: $1,300' })).toBeFocused();
  const stops = await chart(page, 'bar').evaluate((el) => el.shadowRoot.querySelectorAll('[part~="point"][tabindex="0"]').length);
  expect(stops).toBe(1);
  await expect(chart(page, 'bar').locator('[part~="tooltip"]')).toHaveText('Stores, Q4: $1,300');
});

test('the same data is available as a table', async ({ page }) => {
  const toggle = chart(page, 'bar').getByRole('button', { name: 'Show data table' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(chart(page, 'bar').getByRole('button', { name: 'Hide data table' })).toHaveAttribute('aria-expanded', 'true');
  const table = chart(page, 'bar').getByRole('table', { name: 'Revenue by quarter' });
  await expect(table).toBeVisible();
  await expect(table.getByRole('rowheader', { name: 'Q3' })).toBeVisible();
  await expect(table.getByRole('cell', { name: '$1,700' })).toBeVisible();
});

test('line and donut charts name their points; donut shows shares', async ({ page }) => {
  await expect(chart(page, 'line').getByRole('img', { name: 'W4: 520' })).toHaveCount(1);
  await expect(chart(page, 'donut').getByRole('img', { name: 'Search: 540 (54%)' })).toHaveCount(1);
});

test('series differ by more than color: patterns and a legend', async ({ page }) => {
  const fills = await chart(page, 'bar').evaluate((el) => [
    ...new Set([...el.shadowRoot.querySelectorAll('rect[part~="point"]')].map((r) => r.getAttribute('fill'))),
  ]);

  expect(fills).toHaveLength(2);
  expect(fills.some((f) => f.startsWith('url('))).toBe(true);
  await expect(chart(page, 'bar').locator('[part~="legend"] li')).toHaveText(['Online', 'Stores']);
});

test('no WCAG 2.2 AA violations, with the table open too', async ({ page }) => {
  await chart(page, 'bar').getByRole('button', { name: 'Show data table' }).click();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
});

// Final-review fixes: data the chart cannot draw, and keyboard access around it.

/** Replace a chart's data and wait for it to render; collects page errors. */
const setData = (page, chartId, rows, props = {}) =>
  page.evaluate(
    ({ id, data, extra }) => {
      const el = document.getElementById(id);
      Object.assign(el, extra);
      el.data = data.map(
        (row) => row && Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v === 'NaN' ? NaN : v === 'Inf' ? Infinity : v])),
      );

      return el.updateComplete;
    },
    { id: chartId, data: rows, extra: props },
  );

test('non-finite values are treated as missing, not drawn', async ({ page }) => {
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await setData(page, 'bar', [
    { quarter: 'Q1', online: 'NaN', stores: 900 },
    { quarter: 'Q2', online: 1500, stores: 'Inf' },
  ]);

  const attrs = await chart(page, 'bar').evaluate((el) =>
    [...el.shadowRoot.querySelectorAll('svg *')]
      .flatMap((n) => [...n.attributes].map((a) => a.value))
      .filter((v) => /NaN|Infinity/.test(v)),
  );

  expect(attrs).toEqual([]);
  await expect(chart(page, 'bar').getByRole('img', { name: 'Online, Q2: $1,500' })).toBeVisible();
  expect(await page.evaluate(() => document.getElementById('bar').summary)).toContain('$1,500');
  expect(errors).toEqual([]);
});

test('a null row does not break rendering', async ({ page }) => {
  await setData(page, 'bar', [null, { quarter: 'Q2', online: 1500, stores: 950 }]);
  await expect(chart(page, 'bar').getByRole('img', { name: 'Online, Q2: $1,500' })).toBeVisible();
  // The null row draws nothing: one point per series for Q2 only.
  await expect(chart(page, 'bar').getByRole('img', { name: /^(Online|Stores), Q\d/ })).toHaveCount(2);
});

test('the tab stop is the first point that exists', async ({ page }) => {
  await setData(page, 'bar', [
    { quarter: 'Q1', online: null, stores: 900 },
    { quarter: 'Q2', online: 1500, stores: 950 },
  ]);

  const stop = await chart(page, 'bar').evaluate((el) =>
    el.shadowRoot.querySelector('[part~="point"][tabindex="0"]')?.getAttribute('aria-label'),
  );

  expect(stop).toBe('Online, Q2: $1,500');
});

test('arrow keys skip missing values and never lose focus', async ({ page }) => {
  await setData(page, 'bar', [
    { quarter: 'Q1', online: 1200, stores: 900 },
    { quarter: 'Q2', online: null, stores: 950 },
    { quarter: 'Q3', online: 1700, stores: null },
  ]);
  await chart(page, 'bar').getByRole('img', { name: 'Online, Q1: $1,200' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(chart(page, 'bar').getByRole('img', { name: 'Online, Q3: $1,700' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(chart(page, 'bar').getByRole('img', { name: 'Online, Q3: $1,700' })).toBeFocused();
  const stops = await chart(page, 'bar').evaluate((el) => el.shadowRoot.querySelectorAll('[part~="point"][tabindex="0"]').length);
  expect(stops).toBe(1);
});

test('shrinking the data keeps one reachable tab stop', async ({ page }) => {
  await chart(page, 'bar').getByRole('img', { name: 'Stores, Q4: $1,300' }).focus();
  await setData(page, 'bar', [{ quarter: 'Q1', online: 1200, stores: 900 }]);
  const stops = await chart(page, 'bar').evaluate((el) => el.shadowRoot.querySelectorAll('[part~="point"][tabindex="0"]').length);
  expect(stops).toBe(1);
});

test('a donut ignores negative and zero slices, and shows no data when nothing is left', async ({ page }) => {
  await setData(page, 'donut', [
    { source: 'Search', visits: 50 },
    { source: 'Refunds', visits: -20 },
    { source: 'Email', visits: 0 },
  ]);

  const names = await chart(page, 'donut').evaluate((el) =>
    [...el.shadowRoot.querySelectorAll('[part~="point"]')].map((p) => p.getAttribute('aria-label')),
  );

  expect(names).toEqual(['Search: 50 (100%)']);
  await setData(page, 'donut', [
    { source: 'A', visits: 0 },
    { source: 'B', visits: -5 },
  ]);
  expect(await chart(page, 'donut').evaluate((el) => el.shadowRoot.querySelectorAll('[part~="point"]').length)).toBe(0);
  await expect(chart(page, 'donut').getByText('No data', { exact: true })).toBeVisible();
});

// Deferred minors.

test('series beyond six still differ from the earlier ones', async ({ page }) => {
  const series = Array.from({ length: 8 }, (_, i) => ({ key: `s${i}`, label: `S${i}` }));
  await page.evaluate(
    ({ list }) => {
      const el = document.getElementById('bar');
      el.series = list;
      el.data = [Object.fromEntries([['quarter', 'Q1'], ...list.map((s, i) => [s.key, 10 + i])])];

      return el.updateComplete;
    },
    { list: series },
  );

  const look = (index) =>
    chart(page, 'bar').evaluate((el, i) => {
      const bar = el.shadowRoot.querySelector(`[data-s="${i}"][data-r="0"]`);
      const fill = bar.getAttribute('fill');
      const id = fill.match(/#([^)]+)/)?.[1];
      const pattern = id ? el.shadowRoot.getElementById(id) : null;

      return {
        color: pattern ? pattern.querySelector('rect').getAttribute('fill') : fill,
        marks: pattern ? pattern.innerHTML.replaceAll(/fill="[^"]*"/g, '') : 'solid',
      };
    }, index);

  const [first, seventh] = [await look(0), await look(6)];
  expect(seventh.color).toBe(first.color);
  expect(seventh.marks).not.toBe(first.marks);
});

test('in right-to-left pages the arrow keys still move visually (the plot is drawn left to right)', async ({ page }) => {
  await chart(page, 'bar').evaluate((el) => el.setAttribute('dir', 'rtl'));
  await chart(page, 'bar').getByRole('img', { name: 'Online, Q1: $1,200' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(chart(page, 'bar').getByRole('img', { name: 'Online, Q2: $1,500' })).toBeFocused();
});

test('the donut tooltip sits over the focused slice', async ({ page }) => {
  await chart(page, 'donut').getByRole('img').nth(1).focus();

  const [slice, tip] = await chart(page, 'donut').evaluate((el) => {
    const r = (n) => n.getBoundingClientRect();
    const s = r(el.shadowRoot.querySelector('[part~="point-active"]'));
    const t = r(el.shadowRoot.querySelector('[part~="tooltip"]'));

    return [{ l: s.left, r: s.right }, { c: t.left + t.width / 2 }];
  });

  expect(tip.c).toBeGreaterThanOrEqual(slice.l - 2);
  expect(tip.c).toBeLessThanOrEqual(slice.r + 2);
});

test('an invalid number format falls back instead of breaking the chart', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await chart(page, 'bar').evaluate((el) => {
    el.format = { style: 'currency' }; // no currency: Intl throws

    return el.updateComplete;
  });
  await expect(chart(page, 'bar').getByRole('img', { name: /Online, Q1: 1,200/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('axis text uses the label type size (Q20)', async ({ page }) => {
  const [size, label] = await chart(page, 'bar').evaluate((el) => {
    const text = el.shadowRoot.querySelector('.axis text');
    const probe = document.createElement('span');
    probe.style.fontSize = 'var(--focsd-text-label-size)';
    el.shadowRoot.append(probe);
    const sizes = [getComputedStyle(text).fontSize, getComputedStyle(probe).fontSize];
    probe.remove();

    return sizes;
  });

  expect(size).toBe(label);
});

test('an invalid number format warns once and falls back to plain numbers', async ({ page }) => {
  const warnings = [];
  page.on('console', (m) => m.type() === 'warning' && m.text().includes('invalid format') && warnings.push(m.text()));
  await chart(page, 'bar').evaluate(async (el) => {
    for (let i = 0; i < 3; i++) {
      el.format = { style: 'currency' }; // no currency code: Intl throws
      await el.updateComplete;
      el.format = { style: 'decimal' };
      await el.updateComplete;
    }
  });
  expect(warnings).toHaveLength(1);
  expect(warnings[0]).toMatch(/^Focsd: focsd-chart/);
});

test('every axis label sits inside the chart, even long formatted values', async ({ page }) => {
  const outside = (id) =>
    chart(page, id).evaluate(async (el) => {
      await el.updateComplete;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const svgBox = el.shadowRoot.querySelector('svg').getBoundingClientRect();

      return [...el.shadowRoot.querySelectorAll('.axis text')].filter((t) => {
        const b = t.getBoundingClientRect();

        return b.left < svgBox.left - 0.5 || b.right > svgBox.right + 0.5;
      }).length;
    });

  expect(await outside('bar')).toBe(0);
  await chart(page, 'bar').evaluate(async (el) => {
    el.data = el.data.map((row) => ({ ...row, Online: row.Online * 1000 }));
    await el.updateComplete;
  });
  expect(await outside('bar')).toBe(0);
});
