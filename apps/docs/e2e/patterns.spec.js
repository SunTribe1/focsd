import { expect, test } from '@playwright/test';

// Patterns: complete, copy-ready compositions built only from Focsd components.

test.beforeEach(async ({ page }) => {
  await page.goto('/guides/patterns/');
  await page.waitForFunction(() => customElements.get('focsd-data-grid') && customElements.get('focsd-text-field'));
});

test('every pattern renders live, with its code to copy', async ({ page }) => {
  for (const title of ['Sign in', 'Account settings', 'Team members', 'Delete confirmation', 'Kanban board', 'App shell']) {
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  }

  await expect(page.locator('[data-example]')).toHaveCount(6);
});

test('sign in validates like a native form', async ({ page }) => {
  const form = page.locator('#pattern-sign-in');
  await form.getByRole('button', { name: 'Sign in' }).click();
  await expect(form.getByRole('textbox', { name: 'Email' })).toBeFocused();
  await form.getByRole('textbox', { name: 'Email' }).fill('ada@example.com');
  await form.getByLabel('Password', { exact: true }).fill('correct horse');
  await form.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('#pattern-sign-in-status')).toHaveText('Signed in as ada@example.com');
});

test('team members: search filters the grid', async ({ page }) => {
  const grid = page.locator('#pattern-team');
  await grid.getByRole('searchbox').fill('platform');
  await expect.poll(() => grid.getByRole('row').count()).toBe(3); // header + 2 people
});

test('delete confirmation asks before deleting and returns focus', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Delete project' });
  await trigger.click();
  const dialog = page.getByRole('alertdialog', { name: 'Delete this project?' });
  await expect(dialog).toBeVisible();
  await page.locator('#pattern-delete').getByRole('button', { name: 'Cancel' }).click();
  await expect(trigger).toBeFocused();
});

test('account settings: labels sit beside their fields on desktop and stack at 360px', async ({ page }) => {
  const fields = ['focsd-text-field', 'focsd-select', 'focsd-textarea'];
  const settings = page.locator('[data-example]').filter({ has: page.locator('focsd-tabs[label="Settings"]') });

  const boxes = () =>
    settings.evaluate(
      (root, tags) =>
        tags.map((tag) => {
          const host = root.querySelector(tag);
          const box = (part) => host.shadowRoot.querySelector(`[part~="${part}"]`).getBoundingClientRect().toJSON();

          return { tag, label: box('label'), body: box('body') };
        }),
      fields,
    );

  for (const { tag, label, body } of await boxes()) {
    expect(label.right, tag).toBeLessThanOrEqual(body.left + 1);
    expect(Math.abs(label.top - body.top), tag).toBeLessThanOrEqual(8);
  }

  await page.setViewportSize({ width: 360, height: 800 });

  await expect.poll(async () => (await boxes()).every(({ label, body }) => label.bottom <= body.top + 1)).toBe(true);
});

test('kanban: a card moves within its column by keyboard', async ({ page }) => {
  const todo = page.locator('#kanban-todo');
  const cards = () => todo.locator(':scope > focsd-list-item').evaluateAll((items) => items.map((item) => item.label));
  const before = await cards();

  await todo.getByRole('button', { name: `Reorder ${before[0]}`, exact: true }).focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
  await expect.poll(cards).toEqual([before[1], before[0], ...before.slice(2)]);
});

test('kanban: "Move to" moves a card to Done and says so', async ({ page }) => {
  const card = page.locator('#kanban-todo > focsd-list-item').first();
  const name = await card.evaluate((item) => item.label);

  await card.getByRole('button', { name: 'Move to' }).click();
  await page.getByRole('menuitem', { name: 'Done' }).click();
  await expect(page.locator('#kanban-done > focsd-list-item').filter({ hasText: name })).toHaveCount(1);
  await expect(page.locator('#kanban-todo > focsd-list-item').filter({ hasText: name })).toHaveCount(0);
  await expect(page.locator('#pattern-kanban-status')).toHaveText(`Moved ${name} to Done`);
  // Focus stays on the moved card's menu button, now in the Done column.
  await expect(
    page.locator('#kanban-done > focsd-list-item').filter({ hasText: name }).getByRole('button', { name: 'Move to' }),
  ).toBeFocused();
});

test('app shell: the framed page has one main landmark and its skip link', async ({ page }) => {
  const frame = page.frameLocator('iframe[title="App shell example"]');

  await page.locator('iframe[title="App shell example"]').scrollIntoViewIfNeeded();
  await expect(frame.getByRole('main')).toHaveCount(1);
  await expect(frame.getByRole('link', { name: 'Skip to main content' })).toHaveCount(1);
  await expect(frame.getByRole('navigation', { name: 'On this page' })).toHaveCount(1);
});
