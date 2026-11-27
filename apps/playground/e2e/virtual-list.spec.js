import { expect, ready, settle, test } from './fixtures/test.js';
import { frames } from './fixtures/pages.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/virtual-list.html');
  await page.waitForFunction(() => customElements.get('focsd-virtual-list'));
});

test('renders only a window of rows, with set size and position', async ({ page }) => {
  const list = page.getByRole('list', { name: 'Products' });
  await expect(list.getByRole('listitem').first()).toHaveText('Item 1');
  expect(await list.getByRole('listitem').count()).toBeLessThan(40);
  await expect(list.getByRole('listitem').first()).toHaveAttribute('aria-setsize', '100000');
  await expect(list.getByRole('listitem').first()).toHaveAttribute('aria-posinset', '1');
});

test('scrollToIndex lands on the row and fires range-change', async ({ page }) => {
  await page.locator('#fixed').evaluate((el) => el.scrollToIndex(50_000, { align: 'start' }));
  const row = page.getByRole('listitem').filter({ hasText: /^Item 50001$/ });
  await expect(row).toBeVisible();
  await expect(row).toHaveAttribute('aria-posinset', '50001');
  const last = await page.evaluate(() => window.__ranges.at(-1));
  expect(last.first).toBeLessThanOrEqual(50_000);
  expect(last.last).toBeGreaterThanOrEqual(50_000);
});

test('scrolling through 100k rows stays fast', async ({ page }) => {
  const ms = await page.locator('#fixed').evaluate(async (el) => {
    const scroller = el.shadowRoot.querySelector('[part~="viewport"]');
    const t = performance.now();

    for (let i = 0; i < 60; i++) {
      scroller.scrollTop += 50_000;
      await new Promise((r) => requestAnimationFrame(r));
    }

    return (performance.now() - t) / 60;
  });

  expect(ms).toBeLessThan(50);
  await expect(page.getByRole('list', { name: 'Products' }).getByRole('listitem').first()).not.toHaveText('Item 1');
});

test('the scrolling area is keyboard reachable', async ({ page }) => {
  await page.locator('#fixed').evaluate((el) => el.shadowRoot.querySelector('[part~="viewport"]').focus());
  await page.keyboard.press('PageDown');
  await expect
    .poll(() => page.locator('#fixed').evaluate((el) => el.shadowRoot.querySelector('[part~="viewport"]').scrollTop))
    .toBeGreaterThan(0);
});

test('variable heights: rows growing above do not move the visible row', async ({ page }) => {
  await page.locator('#var').evaluate((el) => el.scrollToIndex(702, { align: 'start' }));
  const row = page.getByRole('listitem').filter({ hasText: /^Row 703\b/ });
  await expect(row).toBeVisible();
  await settle(page);
  const before = (await row.boundingBox()).y;
  await page.evaluate(() => window.__loadImages());
  // Two settles: the resize observer re-measures in one frame and the scroll correction lands in the next.
  await settle(page);
  await settle(page);
  expect(Math.abs((await row.boundingBox()).y - before)).toBeLessThanOrEqual(2);
});

test('selectable: an APG listbox with active descendant, ranges and change', async ({ page }) => {
  const box = page.getByRole('listbox', { name: 'Recipients' });
  await expect(box).toHaveAttribute('aria-multiselectable', 'true');
  await box.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
  await page.keyboard.press('Shift+End');
  expect(await page.locator('#pick').evaluate((el) => el.value.length)).toBe(499);
  expect(await page.locator('#pick').evaluate((el) => el.value[0])).toBe('u1');
  await page.keyboard.press('Home');
  const active = await box.getAttribute('aria-activedescendant');
  await expect(page.locator('#pick').getByRole('option').first()).toHaveAttribute('id', active);
  await expect(page.locator('#pick').getByRole('option').first()).toHaveAttribute('aria-selected', 'false');
  expect(await page.evaluate(() => window.__changes)).toBeGreaterThan(0);
  await page.keyboard.press('Control+a');
  expect(await page.locator('#pick').evaluate((el) => el.value.length)).toBe(500);
});

test('a Shift range replaces the previous range from the same anchor (review I8)', async ({ page }) => {
  const box = page.getByRole('listbox', { name: 'Recipients' });
  await box.focus();

  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
  await page.keyboard.press('Shift+End');
  expect(await page.locator('#pick').evaluate((el) => el.value.length)).toBe(495);
  await page.keyboard.press('Shift+Home');
  expect(await page.locator('#pick').evaluate((el) => [...el.value].toSorted())).toEqual(['u0', 'u1', 'u2', 'u3', 'u4', 'u5'].toSorted());
});

test('ranges over 100,000 selected rows stay fast (review I8)', async ({ page }) => {
  const ms = await page.evaluate(async () => {
    const list = document.createElement('focsd-virtual-list');
    list.label = 'Big';
    list.selectable = 'multiple';
    list.setAttribute('item-height', '30');
    list.style.blockSize = '10rem';
    list.items = Array.from({ length: 100_000 }, (_, i) => i);
    list.keyOf = (item) => item;
    document.body.append(list);
    await list.updateComplete;
    const viewport = list.shadowRoot.querySelector('[part~="viewport"]');
    viewport.focus();
    const key = (k, extra = {}) => viewport.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...extra }));
    key('a', { ctrlKey: true });
    const t = performance.now();
    key('End');
    key(' ');
    key('Home', { shiftKey: true });

    return performance.now() - t;
  });

  expect(ms).toBeLessThan(300);
});

/** A measured list of 200 rows whose heights the test controls (`window.__sizes`). */
const makeMeasured = (page) =>
  page.evaluate(async () => {
    window.__sizes = Array.from({ length: 200 }, () => 20);
    const list = document.createElement('focsd-virtual-list');
    list.id = 'measured';
    list.label = 'Measured';
    list.style.blockSize = '240px';
    list.items = Array.from({ length: 200 }, (_, i) => i);
    list.renderItem = (i) => {
      const el = document.createElement('div');
      el.className = 'cell';
      el.style.blockSize = `${window.__sizes[i]}px`;
      el.textContent = `Cell ${i}`;

      return el;
    };

    document.querySelector('main').prepend(list);
    await list.updateComplete;
  });

/** Index and top (relative to the viewport) of the row at the top of the view. */
const firstVisible = (page) =>
  page.locator('#measured').evaluate((el) => {
    const top = el.shadowRoot.querySelector('[part~="viewport"]').getBoundingClientRect().top;
    const row = [...el.shadowRoot.querySelectorAll('[part~="row"]')].find((r) => r.getBoundingClientRect().bottom > top + 0.5);

    return { index: Number(row.dataset.index), y: row.getBoundingClientRect().top - top };
  });

test('measured rows growing above the view near the end keep the visible row in place', async ({ page }) => {
  await makeMeasured(page);

  const scrollToEnd = () =>
    page.locator('#measured').evaluate((el) => {
      const viewport = el.shadowRoot.querySelector('[part~="viewport"]');
      viewport.scrollTop = viewport.scrollHeight;
    });

  // Settle at the very end (measuring rows changes the total).
  for (let i = 0; i < 4; i++) {
    await scrollToEnd();
    await frames(page);
  }

  const before = await firstVisible(page);
  // Rows rendered above the first visible one grow (pictures loading).
  await page.locator('#measured').evaluate((el, index) => {
    for (const row of el.shadowRoot.querySelectorAll('[part~="row"]')) {
      const i = Number(row.dataset.index);

      if (i >= index) continue;
      window.__sizes[i] = 120;
      row.querySelector('.cell').style.blockSize = '120px';
    }
  }, before.index);
  await frames(page);

  const after = await page.locator('#measured').evaluate((el, index) => {
    const top = el.shadowRoot.querySelector('[part~="viewport"]').getBoundingClientRect().top;

    return el.shadowRoot.querySelector(`[data-index="${index}"]`).getBoundingClientRect().top - top;
  }, before.index);

  expect(Math.abs(after - before.y)).toBeLessThanOrEqual(2);
});

for (const align of ['nearest', 'end']) {
  test(`scrollToIndex align ${align} shows a tall unmeasured row`, async ({ page }) => {
    await makeMeasured(page);
    await page.evaluate(() => (window.__sizes[150] = 200));
    await page.locator('#measured').evaluate((el, a) => el.scrollToIndex(150, { align: a }), align);
    await frames(page, 6);

    const box = await page.locator('#measured').evaluate((el) => {
      const view = el.shadowRoot.querySelector('[part~="viewport"]').getBoundingClientRect();
      const row = el.shadowRoot.querySelector('[data-index="150"]')?.getBoundingClientRect();

      return row && { top: row.top - view.top, bottom: row.bottom - view.top, height: view.height };
    });

    expect(box).toBeTruthy();
    expect(box.top).toBeGreaterThanOrEqual(-1);
    expect(box.bottom).toBeLessThanOrEqual(box.height + 1);
  });
}

// Re-homed from final-minors.spec.js (Q48).

test('measured rows inside a scaled container are measured at their layout size', async ({ page }) => {
  await page.goto('/virtual-list.html');
  await ready(page, 'focsd-virtual-list');

  // The same list twice, one inside a scaled container (a dialog scaling in, say). scrollToIndex
  // measures the rows it renders at once (before any ResizeObserver callback); both must agree.
  const [plain, scaled] = await page.evaluate(async () => {
    const make = async (scale) => {
      const stage = document.createElement('div');
      stage.style.transform = `scale(${scale})`;
      stage.style.transformOrigin = '0 0';
      const list = document.createElement('focsd-virtual-list');
      list.label = `Scale ${scale}`;
      list.style.blockSize = '240px';
      list.items = Array.from({ length: 200 }, (_, i) => i);
      list.renderItem = (i) => {
        const el = document.createElement('div');
        el.style.blockSize = '20px';
        el.textContent = `Cell ${i}`;

        return el;
      };

      stage.append(list);
      document.querySelector('main').prepend(stage);
      await list.updateComplete;

      return list;
    };

    const lists = [await make(1), await make(0.5)];

    for (const list of lists) list.scrollToIndex(150, { align: 'start' });

    // Microtasks only: no frame, so no ResizeObserver callback, runs before this returns.
    for (let i = 0; i < 20; i++) await Promise.all(lists.map((l) => l.updateComplete));

    return lists.map((l) => l.shadowRoot.querySelector('[part~="spacer"]').style.blockSize);
  });

  expect(scaled).toBe(plain);
});
