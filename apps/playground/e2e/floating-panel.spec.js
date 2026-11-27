import { expect, test } from './fixtures/test.js';
import AxeBuilder from '@axe-core/playwright';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test.beforeEach(async ({ page }) => {
  await page.goto('/floating.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-floating-panel')));
});

const panel = (page, name = 'Notes') => page.getByRole('dialog', { name, exact: true });

/** Bounding box once any enter transition has finished. */
const rect = (locator) =>
  locator.evaluate(async (el) => {
    await Promise.all(el.getAnimations().map((a) => a.finished));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    return el.getBoundingClientRect().toJSON();
  });

const events = (page, type) => page.evaluate((t) => window.__fpEvents.filter((e) => e.type === t), type);
const header = (page, id = 'fp-notes') => page.locator(`#${id} [part~="header"]`);

/** Drag the header from its title area by (dx, dy) with the mouse. */
async function drag(page, id, dx, dy) {
  const box = await page.locator(`#${id} [part~="title"]`).boundingBox();
  const x = box.x + 10;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 4 });
  await page.mouse.move(x + dx, y + dy, { steps: 4 });
  await page.mouse.up();
}

test('the trigger opens a named, non-modal panel and reports its state', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Notes', exact: true });
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  await expect(panel(page)).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(panel(page)).toBeFocused();
  expect(await events(page, 'focsd-open')).toHaveLength(1);
  // The page stays usable while the panel is open.
  await page.getByRole('button', { name: /Outside/ }).click();
  await expect(page.locator('#fp-count')).toHaveText('1');
  await expect(panel(page)).toBeVisible();
});

test('the close button closes it and returns focus to the trigger', async ({ page }) => {
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await panel(page).getByRole('button', { name: 'Close Notes' }).click();
  await expect(panel(page)).toBeHidden();
  await expect(page.getByRole('button', { name: 'Notes', exact: true })).toBeFocused();
  expect(await events(page, 'close')).toHaveLength(1);
});

test('Escape closes it when focus is inside; the trigger toggles it', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Notes', exact: true });
  await trigger.click();
  await page.locator('#fp-notes').getByRole('textbox', { name: 'Note' }).focus();
  await page.keyboard.press('Escape');
  await expect(panel(page)).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(panel(page)).toBeVisible();
  await trigger.click();
  await expect(panel(page)).toBeHidden();
});

test('dragging the header moves it with the pointer and fires move', async ({ page }) => {
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  const before = await rect(panel(page));
  await drag(page, 'fp-notes', 120, 80);
  const after = await rect(panel(page));
  expect(Math.round(after.x - before.x)).toBe(120);
  expect(Math.round(after.y - before.y)).toBe(80);
  const moves = await events(page, 'focsd-move');
  expect(moves.at(-1).detail).toEqual({ x: Math.round(after.x), y: Math.round(after.y) });
  await expect(panel(page)).toBeVisible();
});

test('it stays fully on screen, even when dragged past the edge or the window shrinks', async ({ page }) => {
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await drag(page, 'fp-notes', 3000, 3000);
  const viewport = page.viewportSize();
  let box = await rect(panel(page));
  expect(box.right).toBeLessThanOrEqual(viewport.width);
  expect(box.bottom).toBeLessThanOrEqual(viewport.height);
  await drag(page, 'fp-notes', -6000, -6000);
  box = await rect(panel(page));
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  await drag(page, 'fp-notes', 3000, 3000);
  await page.setViewportSize({ width: 600, height: 500 });
  await expect.poll(async () => (await rect(panel(page))).right).toBeLessThanOrEqual(600);
  await expect.poll(async () => (await rect(panel(page))).bottom).toBeLessThanOrEqual(500);
});

test('the move button moves it with the arrow keys (WCAG 2.5.7)', async ({ page }) => {
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  const move = panel(page).getByRole('button', { name: 'Move Notes' });
  await expect(move).toHaveAccessibleDescription(/arrow keys/);
  await move.focus();
  const before = await rect(panel(page));
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Shift+ArrowRight');
  const after = await rect(panel(page));
  expect(Math.round(after.x - before.x)).toBe(10 + 50);
  expect(Math.round(after.y - before.y)).toBe(10);
  await expect(move).toBeFocused();
});

test('touch and pen drags move it too', async ({ page }) => {
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  const before = await rect(panel(page));
  await header(page).evaluate((el) => {
    const title = el.querySelector('[part~="title"]');
    const r = title.getBoundingClientRect();

    const at = (type, x, y) =>
      title.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          composed: true,
          pointerId: 7,
          pointerType: 'touch',
          isPrimary: true,
          clientX: x,
          clientY: y,
          button: 0,
          buttons: type === 'pointerup' ? 0 : 1,
        }),
      );

    at('pointerdown', r.x + 5, r.y + 5);
    at('pointermove', r.x + 45, r.y + 35);
    at('pointerup', r.x + 45, r.y + 35);
  });
  const after = await rect(panel(page));
  expect(Math.round(after.x - before.x)).toBe(40);
  expect(Math.round(after.y - before.y)).toBe(30);
  expect(await header(page).evaluate((el) => getComputedStyle(el).touchAction)).toBe('none');
});

test('remembers where it was moved when reopened', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Notes', exact: true });
  await trigger.click();
  await drag(page, 'fp-notes', 90, 60);
  const moved = await rect(panel(page));
  await panel(page).getByRole('button', { name: 'Close Notes' }).click();
  await trigger.click();
  const again = await rect(panel(page));
  expect(Math.round(again.x)).toBe(Math.round(moved.x));
  expect(Math.round(again.y)).toBe(Math.round(moved.y));
});

test('several can be open; the one you touch comes to the front', async ({ page }) => {
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await page.getByRole('button', { name: 'Help', exact: true }).click();
  await expect(panel(page)).toBeVisible();
  await expect(panel(page, 'Help')).toBeVisible();
  // Put Help over Notes, then touch Notes.
  const notes = await rect(panel(page));
  await page.locator('#fp-help').evaluate((el, at) => el.moveTo(at.x + 20, at.y + 20), notes);
  const topAt = (x, y) => page.evaluate(([px, py]) => document.elementFromPoint(px, py)?.closest('focsd-floating-panel')?.id, [x, y]);
  expect(await topAt(notes.x + 30, notes.y + 30)).toBe('fp-help');
  await page.mouse.click(notes.x + 8, notes.y + notes.height - 8);
  expect(await topAt(notes.x + 30, notes.y + 30)).toBe('fp-notes');
});

test('opens from code without a trigger, at the bottom end of the screen', async ({ page }) => {
  await page.locator('#fp-free').evaluate((el) => el.show());
  const box = await rect(panel(page, 'Standalone'));
  const viewport = page.viewportSize();
  expect(viewport.width - box.right).toBeGreaterThan(0);
  expect(viewport.width - box.right).toBeLessThanOrEqual(32);
  expect(viewport.height - box.bottom).toBeLessThanOrEqual(32);
  await page.locator('#fp-free').evaluate((el) => (el.open = false));
  await expect(panel(page, 'Standalone')).toBeHidden();
});

test('no WCAG 2.2 AA violations while open', async ({ page }) => {
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await expect(panel(page)).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
});
