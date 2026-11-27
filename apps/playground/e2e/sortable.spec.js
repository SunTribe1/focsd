import { expect, test } from './fixtures/test.js';
import { expectAnnounced, recordAnnouncements } from './fixtures/announcements.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test.beforeEach(async ({ page }) => {
  await recordAnnouncements(page);
  await page.goto('/sortable.html');
  await page.waitForFunction(() => customElements.get('focsd-list'));
});

const order = (page, id = 'l') =>
  page
    .locator(`#${id} > focsd-list-item`)
    .allTextContents()
    .then((t) => t.map((s) => s.trim()));

test('each item has a reorder button', async ({ page }) => {
  await expect(page.locator('#l').getByRole('button', { name: /^Reorder / })).toHaveCount(5);
});

test('grab, move and drop by keyboard, with announcements and an event', async ({ page }) => {
  const handle = page.getByRole('button', { name: 'Reorder Design review' });
  await handle.focus();
  await page.keyboard.press('Space');
  await expectAnnounced(page, 'Grabbed Design review, position 2 of 5');
  await page.keyboard.press('ArrowDown');
  await expectAnnounced(page, 'Moved to position 3 of 5');
  await expect(handle).toBeFocused();
  await page.keyboard.press('Space');
  await expectAnnounced(page, 'Dropped at position 3');
  expect(await order(page)).toEqual(['Write notes', 'Run tests', 'Design review', 'Tag release', 'Announce']);
  expect(await page.evaluate(() => window.__ev)).toEqual([{ list: 'l', from: 1, to: 2 }]);
});

test('announcements stay in a live region the move does not remove', async ({ page }) => {
  // Which item's live region holds the text; the moving item leaves the DOM on each move.
  const region = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('#l > focsd-list-item')].flatMap((item) => {
        const text = item.shadowRoot.querySelector('[role="status"]')?.textContent ?? '';

        return text ? [{ item: item.textContent.trim(), text }] : [];
      }),
    );

  await page.getByRole('button', { name: 'Reorder Write notes' }).focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  expect(await region()).toEqual([{ item: 'Design review', text: 'Moved to position 2 of 5' }]);
  await page.keyboard.press('Space');
  expect(await region()).toEqual([{ item: 'Design review', text: 'Dropped at position 2' }]);
  await expectAnnounced(page, 'Dropped at position 2');
});

test('Escape cancels and puts the item back', async ({ page }) => {
  await page.getByRole('button', { name: 'Reorder Design review' }).focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  await expectAnnounced(page, 'Canceled, back to position 2');
  expect((await order(page))[1]).toBe('Design review');
  expect(await page.evaluate(() => window.__ev)).toEqual([]);
});

test('a pointer press elsewhere cancels a keyboard grab', async ({ page }) => {
  await page.getByRole('button', { name: 'Reorder Design review' }).focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.getByRole('heading', { level: 1 }).click();
  await expectAnnounced(page, 'Canceled, back to position 2');
  expect((await order(page))[1]).toBe('Design review');
  expect(await page.evaluate(() => window.__ev)).toEqual([]);
});

test('a canceled focsd-reorder puts the item back', async ({ page }) => {
  const before = await order(page, 'lc');
  await page
    .locator('#lc')
    .getByRole('button', { name: /^Reorder / })
    .first()
    .focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
  expect(await order(page, 'lc')).toEqual(before);
});

test('pointer drag reorders, with a placeholder, and auto-scrolls', async ({ page }) => {
  const handle = page.getByRole('button', { name: 'Reorder Write notes' });
  const target = await page.locator('#l > focsd-list-item').nth(2).boundingBox();
  const box = await handle.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, target.y + target.height * 0.75, { steps: 8 });
  await expect(page.locator('#l [data-sortable-placeholder]')).toHaveCount(1);
  await page.mouse.up();
  expect((await order(page))[2]).toBe('Write notes');
  const scroller = page.locator('#scroller');
  await scroller.scrollIntoViewIfNeeded();

  const first = await page
    .locator('#long')
    .getByRole('button', { name: /^Reorder / })
    .first()
    .boundingBox();

  const scrollBox = await scroller.boundingBox();
  await page.mouse.move(first.x + 4, first.y + 4);
  await page.mouse.down();
  await page.mouse.move(first.x + 4, scrollBox.y + scrollBox.height - 4, { steps: 4 });
  await expect.poll(() => scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  await page.mouse.up();
});

test('tag input: tags reorder by keyboard and the form value follows', async ({ page }) => {
  await page.locator('#t').getByRole('button', { name: 'Reorder Lit' }).focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Space');
  await expect(page.locator('#t')).toHaveJSProperty('values', ['Lit', 'CSS', 'HTML']);
  await expect(page.locator('#t').getByRole('button', { name: 'Reorder Lit' })).toBeFocused();
  expect(await page.evaluate(() => window.__tagEvents)).toEqual([
    { type: 'focsd-reorder', from: 2, to: 0, value: 'Lit' },
    { type: 'input', value: 'Lit,CSS,HTML' },
    { type: 'change', value: 'Lit,CSS,HTML' },
  ]);
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.locator('#out')).toContainText('["skills","Lit"],["skills","CSS"],["skills","HTML"]');
});

test('tag input: handles join the remove buttons in one tab stop', async ({ page }) => {
  const t = page.locator('#t');
  await t.getByRole('button', { name: 'Remove CSS' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(t.getByRole('button', { name: 'Reorder HTML' })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(t.getByRole('button', { name: 'Reorder CSS' })).toBeFocused();
  await expect(t.locator('button[tabindex="0"]')).toHaveCount(1);
});

test('tag input: Escape puts the tag back and leaves the value', async ({ page }) => {
  await page.locator('#t').getByRole('button', { name: 'Reorder CSS' }).focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  await expectAnnounced(page, 'Canceled, back to position 1');
  await expect(page.locator('#t')).toHaveJSProperty('values', ['CSS', 'HTML', 'Lit']);
  expect(await page.evaluate(() => window.__tagEvents)).toEqual([]);
});

test.describe('touch', () => {
  test.use({ hasTouch: true, isMobile: true });

  test('a touch drag on the handle reorders', async ({ page }) => {
    const handle = page.getByRole('button', { name: 'Reorder Announce' });
    const b = await handle.boundingBox();
    const top = await page.locator('#l > focsd-list-item').first().boundingBox();

    const fire = (type, y) =>
      handle.dispatchEvent(type, { pointerType: 'touch', pointerId: 1, isPrimary: true, clientX: b.x + 4, clientY: y });

    await fire('pointerdown', b.y + 4);

    for (let i = 1; i <= 6; i++) await fire('pointermove', b.y + 4 - ((b.y - top.y) * i) / 6);

    await fire('pointerup', top.y + 2);

    expect((await order(page))[0]).toBe('Announce');
  });
});

for (const theme of THEMES)
  test(`axe-clean in the ${theme} theme`, async ({ page }) => {
    await gotoInTheme(page, '/sortable.html', theme, 'focsd-list');
    await expectAxeClean(page);
  });

test('an item with a label names its handle and announcements by it, not by all its text', async ({ page }) => {
  await page.evaluate(async () => {
    const list = document.createElement('focsd-list');

    list.id = 'cards';
    list.label = 'Cards';
    list.sortable = true;
    list.innerHTML = `<focsd-list-item label="Fix login">Fix login <button type="button">Move to</button></focsd-list-item>
      <focsd-list-item label="Write docs">Write docs <button type="button">Move to</button></focsd-list-item>`;
    document.body.append(list);
    await list.updateComplete;
  });

  const handle = page.locator('#cards').getByRole('button', { name: 'Reorder Fix login', exact: true });

  await handle.focus();
  await page.keyboard.press('Space');
  await expectAnnounced(page, 'Grabbed Fix login, position 1 of 2');
  await page.keyboard.press('Escape');
});

// 14c-9 batch review fixes

test('tag input with equal tags: the moved tag keeps focus after the drop', async ({ page }) => {
  await page.locator('#t').evaluate(async (t) => {
    Object.assign(t, { allowDuplicates: true, values: ['A', 'B', 'A'] });
    await t.updateComplete;
  });
  const handles = page.locator('#t').getByRole('button', { name: 'Reorder A' });

  await handles.first().focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await expect(page.locator('#t')).toHaveJSProperty('values', ['B', 'A', 'A']);
  // The focused handle is the one in the slot the tag was dropped in (the third tag).
  await expect
    .poll(() =>
      page.locator('#t').evaluate((t) => [...t.shadowRoot.querySelectorAll('[part~="handle"]')].indexOf(t.shadowRoot.activeElement)),
    )
    .toBe(2);
});

test('tag input: the drag placeholder is a list item, so the list stays valid', async ({ page }) => {
  const handle = page.locator('#t').getByRole('button', { name: 'Reorder CSS' });
  const box = await handle.boundingBox();

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2, { steps: 4 });
  await expect(page.locator('#t [data-sortable-placeholder]')).toHaveCount(1);
  expect(await page.locator('#t [data-sortable-placeholder]').evaluate((p) => [p.localName, p.parentElement.localName])).toEqual([
    'li',
    'ul',
  ]);
  await expectAxeClean(page);
  await page.mouse.up();
});

/** A list that is both selectable and sortable, appended to main. */
const mountPick = (page) =>
  page.evaluate(async () => {
    const list = document.createElement('focsd-list');

    list.id = 'pick';
    list.label = 'Priority';
    list.selectable = true;
    list.sortable = true;
    list.innerHTML = `<focsd-list-item value="a">Alpha</focsd-list-item>
      <focsd-list-item value="b">Bravo</focsd-list-item>
      <focsd-list-item value="c">Charlie</focsd-list-item>`;
    list.addEventListener('focsd-reorder', (e) => window.__ev.push({ list: 'pick', from: e.detail.from, to: e.detail.to }));
    document.querySelector('main').append(list);
    await list.updateComplete;
  });

const options = (page) =>
  page
    .locator('#pick')
    .getByRole('option')
    .allTextContents()
    .then((t) => t.map((s) => s.trim()));

test('selectable and sortable: has no button inside an option: the handle is pointer-only', async ({ page }) => {
  await mountPick(page);
  await expect(page.locator('#pick').getByRole('option')).toHaveCount(3);
  await expect(page.locator('#pick').getByRole('button')).toHaveCount(0);
  await expect(page.locator('#pick [part~="handle"]').first()).toHaveAttribute('aria-hidden', 'true');
  await expectAxeClean(page);
});

test('selectable and sortable: Alt+ArrowDown and Alt+ArrowUp move the focused option, announced, with focsd-reorder', async ({ page }) => {
  await mountPick(page);
  const alpha = page.locator('#pick').getByRole('option', { name: 'Alpha' });

  await alpha.focus();
  await page.keyboard.press('Alt+ArrowDown');
  expect(await options(page)).toEqual(['Bravo', 'Alpha', 'Charlie']);
  await expect(alpha).toBeFocused();
  await expectAnnounced(page, 'Moved to position 2 of 3');
  await page.keyboard.press('Alt+ArrowDown');
  await page.keyboard.press('Alt+ArrowDown');
  expect(await options(page)).toEqual(['Bravo', 'Charlie', 'Alpha']);
  await page.keyboard.press('Alt+ArrowUp');
  expect(await options(page)).toEqual(['Bravo', 'Alpha', 'Charlie']);
  await expect(alpha).toBeFocused();
  expect(await page.evaluate(() => window.__ev)).toEqual([
    { list: 'pick', from: 0, to: 1 },
    { list: 'pick', from: 1, to: 2 },
    { list: 'pick', from: 2, to: 1 },
  ]);
  // Plain arrows still move focus, and selection is unchanged by a move.
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#pick').getByRole('option', { name: 'Charlie' })).toBeFocused();
  await expect(page.locator('#pick')).toHaveJSProperty('value', '');
});

test('selectable and sortable: a pointer drag on the handle still reorders', async ({ page }) => {
  await mountPick(page);
  await page.locator('#pick').scrollIntoViewIfNeeded();
  const handle = page.locator('#pick [part~="handle"]').first();
  const box = await handle.boundingBox();
  const target = await page.locator('#pick').getByRole('option').nth(2).boundingBox();

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, target.y + target.height * 0.75, { steps: 8 });
  await page.mouse.up();
  expect(await options(page)).toEqual(['Bravo', 'Charlie', 'Alpha']);
});

test('a disabled item in a sortable list has a disabled handle', async ({ page }) => {
  await page
    .locator('#l > focsd-list-item')
    .nth(1)
    .evaluate(async (item) => {
      Object.assign(item, { disabled: true });
      await item.updateComplete;
    });
  // toBeDisabled would also pass through the item's aria-disabled: check the button itself.
  await expect(page.getByRole('button', { name: 'Reorder Design review' })).toHaveJSProperty('disabled', true);
  await expect(page.getByRole('button', { name: 'Reorder Write notes' })).toHaveJSProperty('disabled', false);
  // A press on it starts no drag.
  const box = await page.getByRole('button', { name: 'Reorder Design review' }).boundingBox();

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + 120, { steps: 6 });
  await expect(page.locator('#l [data-sortable-placeholder]')).toHaveCount(0);
  await page.mouse.up();
});
