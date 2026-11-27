import { expect, test } from './fixtures/test.js';
import { mountInMain as mountFromMinorsPolish, openFromMinorsPolish } from './fixtures/pages.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test.beforeEach(async ({ page }) => {
  await page.goto('/splitter.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => customElements.get('focsd-splitter-pane'));
});

const sep = (page, name) => page.locator('#three').getByRole('separator', { name });
const sizes = (page, id = 'three') => page.locator(`#${id}`).evaluate((el) => el.sizes.map(Math.round));

test('one separator per boundary, with value, limits and controls', async ({ page }) => {
  await expect(page.locator('#three').getByRole('separator')).toHaveCount(2);
  await expect(sep(page, 'Resize Folders')).toHaveAttribute('aria-valuenow', '25');
  await expect(sep(page, 'Resize Folders')).toHaveAttribute('aria-valuemin', '15');
  await expect(sep(page, 'Resize Folders')).toHaveAttribute('aria-orientation', 'vertical');
  expect(await sizes(page)).toEqual([25, 40, 35]);
});

test('arrows move 1%, Shift 10%, Home and End go to the limits', async ({ page }) => {
  await sep(page, 'Resize Folders').focus();
  await page.keyboard.press('ArrowRight');
  expect(await sizes(page)).toEqual([26, 39, 35]);
  await page.keyboard.press('Shift+ArrowLeft');
  expect(await sizes(page)).toEqual([16, 49, 35]);
  await page.keyboard.press('Home');
  expect((await sizes(page))[0]).toBe(15);
  await page.keyboard.press('End');
  expect((await sizes(page))[1]).toBe(20);
});

test('Enter collapses a collapsible pane and restores it', async ({ page }) => {
  await sep(page, 'Resize Messages').focus();
  await page.keyboard.press('Enter');
  expect((await sizes(page))[2]).toBe(0);
  await expect(page.locator('#p3')).toHaveAttribute('collapsed', '');
  await page.keyboard.press('Enter');
  expect(await sizes(page)).toEqual([25, 40, 35]);
});

test('focsd-resize reports sizes; autosave restores them after a reload', async ({ page }) => {
  await page.evaluate(() => document.querySelector('#three').addEventListener('focsd-resize', (e) => (window.__sizes = e.detail.sizes)));
  await sep(page, 'Resize Folders').focus();
  await page.keyboard.press('Shift+ArrowRight');
  expect((await page.evaluate(() => window.__sizes)).map(Math.round)).toEqual([35, 30, 35]);
  await page.reload();
  await page.waitForFunction(() => customElements.get('focsd-splitter-pane'));
  expect(await sizes(page)).toEqual([35, 30, 35]);
});

test('vertical splitters use Up and Down; a nested splitter is independent', async ({ page }) => {
  const s = page.locator('#vert > focsd-splitter-pane').first();
  const v = page.locator('#vert').getByRole('separator').first();
  await expect(v).toHaveAttribute('aria-orientation', 'horizontal');
  await v.focus();
  await page.keyboard.press('ArrowDown');
  expect((await sizes(page, 'vert'))[0]).toBe(51);
  expect(await sizes(page, 'nested')).toEqual([50, 50]);
  await expect(s).toBeVisible();
});

test('RTL mirrors Left and Right; pointer drag resizes', async ({ page }) => {
  await page.locator('#three').evaluate((el) => el.setAttribute('dir', 'rtl'));
  await sep(page, 'Resize Folders').focus();
  await page.keyboard.press('ArrowLeft');
  expect((await sizes(page))[0]).toBe(26);
  await page.locator('#three').evaluate((el) => el.removeAttribute('dir'));
  const box = await sep(page, 'Resize Messages').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x - 40, box.y + box.height / 2, { steps: 4 });
  await page.mouse.up();
  expect((await sizes(page))[1]).toBeLessThan(39);
});

test('the two-slot splitter uses the pane steps: 1 %, 10 % with Shift (review item 4)', async ({ page }) => {
  const legacy = page.locator('#legacy').getByRole('separator', { name: 'Resize sidebar' });
  const before = Number(await legacy.getAttribute('aria-valuenow'));
  await legacy.focus();
  await page.keyboard.press('ArrowRight');
  await expect(legacy).toHaveAttribute('aria-valuenow', String(before + 1));
  await page.keyboard.press('Shift+ArrowRight');
  await expect(legacy).toHaveAttribute('aria-valuenow', String(before + 11));
});

for (const theme of THEMES)
  test(`axe-clean in the ${theme} theme`, async ({ page }) => {
    await gotoInTheme(page, '/splitter.html', theme, 'focsd-splitter-pane');
    await expectAxeClean(page);
  });

// Fix round 1

const mount = (page, markup) =>
  page.evaluate(async (html) => {
    const box = document.createElement('div');

    box.innerHTML = html;
    document.querySelector('main').append(box);
    await Promise.all([...box.querySelectorAll('*')].map((el) => el.updateComplete));
  }, markup);

const addPane = (page) =>
  page.locator('#three').evaluate(async (el) => {
    const pane = document.createElement('focsd-splitter-pane');

    pane.label = 'Late';
    el.append(pane);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await el.updateComplete;
  });

test('a pane added later gets an equal share and the others keep their ratios', async ({ page }) => {
  await addPane(page);
  const after = await page.locator('#three').evaluate((el) => el.sizes);

  expect(after).toHaveLength(4);
  expect(after[3]).toBeCloseTo(25, 0);
  expect(after[0] / after[1]).toBeCloseTo(25 / 40, 2);
  expect(after[2] / after[1]).toBeCloseTo(35 / 40, 2);
  await expect(page.locator('#three').getByRole('separator')).toHaveCount(3);
});

test('a collapsed pane stays collapsed, and restores its size, after the panes change', async ({ page }) => {
  await sep(page, 'Resize Messages').focus();
  await page.keyboard.press('Enter');
  await addPane(page);
  expect((await sizes(page))[2]).toBe(0);
  await expect(page.locator('#p3')).toHaveAttribute('collapsed', '');
  await sep(page, 'Resize Messages').focus();
  await page.keyboard.press('Enter');
  expect((await sizes(page))[2]).toBeGreaterThan(20);
});

test('separators have a pointer target of at least --focsd-target-min, and both beside a collapsed pane still work', async ({ page }) => {
  const [target, floor] = await sep(page, 'Resize Folders').evaluate((el) => {
    const probe = document.createElement('div');

    probe.style.inlineSize = 'var(--focsd-target-min)';
    document.body.append(probe);
    const min = probe.getBoundingClientRect().width;

    probe.remove();

    // The separator itself is the grab area (its line and grip dots are drawn inside it).
    return [el.getBoundingClientRect().width, min];
  });

  expect(floor).toBeGreaterThanOrEqual(24);
  expect(target).toBeGreaterThanOrEqual(floor - 0.5);
  await page.locator('#p2').evaluate((el) => (el.collapsible = true));
  await sep(page, 'Resize Folders').focus();
  await page.keyboard.press('Enter');
  expect((await sizes(page))[1]).toBe(0);
  await page.keyboard.press('ArrowLeft');
  expect((await sizes(page))[1]).toBe(20);
  await page.keyboard.press('Enter');
  expect((await sizes(page))[1]).toBe(0);
  await sep(page, 'Resize Messages').focus();
  await page.keyboard.press('ArrowRight');
  expect((await sizes(page))[1]).toBe(20);

  // Each separator still has a point where a pointer reaches it.
  const reachable = await page.locator('#three').evaluate((el) =>
    [...el.shadowRoot.querySelectorAll('[part~="separator"]')].map((s) => {
      const box = s.getBoundingClientRect();

      return [-20, -10, 0, 4, 10, 20].some((dx) => {
        const hit = el.shadowRoot.elementFromPoint(box.left + box.width / 2 + dx, box.top + box.height / 2);

        return hit === s;
      });
    }),
  );

  expect(reachable).toEqual([true, true]);
});

test('separators show in forced colors: CanvasText, and Highlight when focused', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'forced-colors emulation is Chromium-only');
  await page.emulateMedia({ forcedColors: 'active' });

  const colors = (name) =>
    sep(page, name).evaluate((el) => {
      const probe = document.createElement('span');

      const read = (value) => {
        probe.style.backgroundColor = value;

        return getComputedStyle(probe).backgroundColor;
      };

      document.body.append(probe);

      // The line is drawn from --_line (a gradient image), so resolve that color.
      const result = {
        own: read(getComputedStyle(el).getPropertyValue('--_line').trim()),
        text: read('CanvasText'),
        highlight: read('Highlight'),
      };

      probe.remove();

      return result;
    });

  const rest = await colors('Resize Folders');

  expect(rest.own).toBe(rest.text);
  await sep(page, 'Resize Folders').focus();
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(async () => {
      const focused = await colors('Resize Folders');

      return focused.own === focused.highlight;
    })
    .toBe(true);
});

test('keys with Ctrl, Alt or Meta are left to the page', async ({ page }) => {
  await sep(page, 'Resize Folders').focus();
  await page.keyboard.press('Control+ArrowRight');
  await page.keyboard.press('Alt+ArrowRight');
  await page.keyboard.press('Meta+ArrowRight');
  expect(await sizes(page)).toEqual([25, 40, 35]);
});

test('sizes keep two decimals and add up to 100; autosave writes when the drag ends', async ({ page }) => {
  await sep(page, 'Resize Folders').scrollIntoViewIfNeeded();
  const box = await sep(page, 'Resize Folders').boundingBox();

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 37, box.y + box.height / 2, { steps: 3 });
  expect(await page.evaluate(() => localStorage.getItem('focsd-splitter:pg-three'))).toBeNull();
  await page.mouse.up();
  const exact = await page.locator('#three').evaluate((el) => el.sizes);

  expect(exact.every((size) => Math.abs(size * 100 - Math.round(size * 100)) < 1e-6)).toBe(true);
  expect(Math.round(exact.reduce((a, b) => a + b) * 100)).toBe(10000);
  expect(exact[0]).toBeGreaterThan(25);
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem('focsd-splitter:pg-three')))).toEqual(exact);
});

test('Enter on a pane collapsed with nothing to restore opens it to an equal share', async ({ page }) => {
  await mount(
    page,
    '<focsd-splitter id="zero"><focsd-splitter-pane label="Left" size="0" collapsible>L</focsd-splitter-pane><focsd-splitter-pane label="Right">R</focsd-splitter-pane></focsd-splitter>',
  );
  expect(await sizes(page, 'zero')).toEqual([0, 100]);
  await page.locator('#zero').getByRole('separator').focus();
  await page.keyboard.press('Enter');
  expect(await sizes(page, 'zero')).toEqual([50, 50]);
});

test('a separator beside a pane with no label is named by the pane number', async ({ page }) => {
  await page.evaluate(async () => {
    const splitter = document.createElement('focsd-splitter');

    splitter.id = 'unnamed';
    splitter.innerHTML = '<focsd-splitter-pane><p>One</p></focsd-splitter-pane><focsd-splitter-pane><p>Two</p></focsd-splitter-pane>';
    document.body.append(splitter);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await splitter.updateComplete;
  });

  await expect(page.locator('#unnamed').getByRole('separator', { name: 'Resize pane 1' })).toHaveCount(1);
});

// 14c-9 batch review fixes

test('a collapsed collapsible pane reports 0 within its limits (aria-valuemin 0)', async ({ page }) => {
  await page.locator('#p1').evaluate((pane) => pane.setAttribute('collapsible', ''));
  const folders = sep(page, 'Resize Folders');

  await folders.focus();
  await page.keyboard.press('Enter');
  expect((await sizes(page))[0]).toBe(0);
  await expect(folders).toHaveAttribute('aria-valuenow', '0');
  await expect(folders).toHaveAttribute('aria-valuemin', '0');
  // A pane that cannot collapse keeps its own minimum.
  await expect(sep(page, 'Resize Messages')).toHaveAttribute('aria-valuemin', '20');
});

test('only the primary button drags a separator', async ({ page }) => {
  for (const [id, name] of [
    ['three', 'Resize Folders'],
    ['legacy', 'Resize sidebar'],
  ]) {
    const separator = page.locator(`#${id}`).getByRole('separator', { name });
    const before = await page.locator(`#${id}`).evaluate((el) => el.sizes.join());
    const box = await separator.boundingBox();

    for (const button of ['right', 'middle']) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down({ button });
      await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2, { steps: 4 });
      await page.mouse.up({ button });
      await page.keyboard.press('Escape');
    }

    expect(await page.locator(`#${id}`).evaluate((el) => el.sizes.join())).toBe(before);
  }
});

test('the legacy splitter gets no orientation attribute; a vertical one still stacks its panes', async ({ page }) => {
  await expect(page.locator('#legacy')).not.toHaveAttribute('orientation');
  await page.locator('#three').evaluate((el) => el.removeAttribute('orientation'));
  await expect(page.locator('#three')).not.toHaveAttribute('orientation');
  const [a, b] = await page.locator('#vert > focsd-splitter-pane').evaluateAll((panes) => panes.map((p) => p.getBoundingClientRect().top));

  expect(b).toBeGreaterThan(a);
});

test('autosave survives blocked storage, malformed JSON and a saved array of the wrong length', async ({ page }) => {
  const errors = [];

  page.on('pageerror', (e) => errors.push(e.message));

  for (const saved of ['{not json', '[50,50]', '["a","b","c"]']) {
    await page.evaluate((value) => localStorage.setItem('focsd-splitter:pg-three', value), saved);
    await page.reload();
    await page.waitForFunction(() => customElements.get('focsd-splitter-pane'));
    expect(await sizes(page)).toEqual([25, 40, 35]);
  }

  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException('blocked', 'SecurityError');
    };

    Storage.prototype.setItem = () => {
      throw new DOMException('blocked', 'SecurityError');
    };
  });
  await page.reload();
  await page.waitForFunction(() => customElements.get('focsd-splitter-pane'));
  expect(await sizes(page)).toEqual([25, 40, 35]);
  await sep(page, 'Resize Folders').focus();
  await page.keyboard.press('ArrowRight');
  expect(await sizes(page)).toEqual([26, 39, 35]);
  expect(errors).toEqual([]);
});

// Re-homed from minors-polish.spec.js (Q48).

test('dragging the splitter does not select page text', async ({ page }) => {
  await openFromMinorsPolish(page);
  await mountFromMinorsPolish(
    page,
    '<focsd-splitter id="spl" label="Panels" style="block-size: 8rem"><p slot="start">Start pane text to select</p><p slot="end">End pane text to select</p></focsd-splitter>',
  );
  const bar = await page.locator('#spl').getByRole('separator').boundingBox();
  await page.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2);
  await page.mouse.down();
  await page.mouse.move(bar.x + 120, bar.y + bar.height / 2, { steps: 6 });
  await page.mouse.up();
  expect(await page.evaluate(() => window.getSelection().toString())).toBe('');
  expect(
    await page
      .locator('#spl')
      .getByRole('separator')
      .evaluate((el) => getComputedStyle(el).touchAction),
  ).toBe('none');
});

test('a splitter value outside min and max is shown clamped', async ({ page }) => {
  await openFromMinorsPolish(page);
  await mountFromMinorsPolish(
    page,
    '<focsd-splitter id="spl2" label="Panels" value="97"><p slot="start">A</p><p slot="end">B</p></focsd-splitter>',
  );
  await expect(page.locator('#spl2').getByRole('separator')).toHaveAttribute('aria-valuenow', '90');
});
