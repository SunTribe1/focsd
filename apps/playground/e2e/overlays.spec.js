import { expect, test } from './fixtures/test.js';
import { deepActive } from './fixtures/dom.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/overlays.html');
  await page.waitForFunction(() =>
    [
      'focsd-popover',
      'focsd-tooltip',
      'focsd-menu',
      'focsd-menu-item',
      'focsd-context-menu',
      'focsd-alert-dialog',
      'focsd-drawer',
      'focsd-toaster',
      'focsd-accordion',
      'focsd-accordion-item',
      'focsd-disclosure',
    ].every((t) => customElements.get(t)),
  );
});

test('popover: trigger exposes expanded state; opens a labelled dialog, moves focus in; Escape returns focus', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Filters' });
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  await expect(page.getByRole('dialog', { name: 'Filter members' })).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('checkbox', { name: 'Active only' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Filter members' })).toBeHidden();
  expect(await deepActive(page)).toBe('pop-trigger');
});

test('tooltip: describes the trigger; shows on focus and hover; Escape hides', async ({ page }) => {
  const button = page.getByRole('button', { name: 'Copy link' });
  await expect(button).toHaveAccessibleDescription('Copies a link anyone in the workspace can open');
  const tip = page.locator('#tip').locator('[role="tooltip"]');
  await expect(tip).toBeHidden();
  await button.focus();
  await expect(tip).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tip).toBeHidden();
  await button.blur();
  await button.hover();
  await expect(tip).toBeVisible();
});

test('menu button: opens on ArrowDown at first item, arrows wrap, skips disabled, Enter selects and returns focus', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Actions' });
  await expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menu', { name: 'Project actions' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(page.getByRole('menuitem', { name: 'Duplicate' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#menu-result')).toHaveText('duplicate');
  await expect(page.getByRole('menu')).toBeHidden();
  expect(await deepActive(page)).toBe('menu-trigger');
});

test('menu moved while open resets to closed, and its trigger says so (14b-11 m14)', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Actions' });
  await trigger.press('ArrowDown');
  await expect(page.getByRole('menu', { name: 'Project actions' })).toBeVisible();
  // A framework move: removal hides the popover without toggle events.
  await page.evaluate(() => {
    const menu = document.getElementById('menu');
    menu.parentElement.append(menu);
  });
  await expect(page.getByRole('menu', { name: 'Project actions' })).toBeHidden();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(await page.locator('#menu').evaluate((el) => el.open)).toBe(false);
  await trigger.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
});

test('menu: snapshot, typeahead and Escape', async ({ page }) => {
  await page.getByRole('button', { name: 'Actions' }).click();
  await expect(page.getByRole('menu', { name: 'Project actions' })).toMatchAriaSnapshot(`
    - menu "Project actions":
      - menuitem "Rename"
      - menuitem "Duplicate"
      - menuitem "Archive (locked)" [disabled]
      - menuitem "Delete"
  `);
  await page.keyboard.press('d');
  await expect(page.getByRole('menuitem', { name: 'Duplicate' })).toBeFocused();
  await page.keyboard.press('d');
  await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toBeHidden();
});

test('context menu: opens with Shift+F10 on the focused target and on right-click', async ({ page }) => {
  await page.locator('#ctx-target').focus();
  await page.keyboard.press('Shift+F10');
  await expect(page.getByRole('menu', { name: 'File actions' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Open' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.locator('#ctx-result')).toHaveText('download');
  await page.locator('#ctx-target').click({ button: 'right' });
  await expect(page.getByRole('menu', { name: 'File actions' })).toBeVisible();
});

test('alert dialog: role alertdialog with description, focus on the least destructive action', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete project' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Delete Atlas?' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleDescription(/permanently deletes 26 files/);
  await expect(page.getByRole('button', { name: 'Keep project' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#ad-result')).toHaveText('(dismissed)');
});

test('drawer: modal dialog from the edge that closes with its action', async ({ page }) => {
  await page.getByRole('button', { name: 'Open settings' }).click();
  await expect(page.getByRole('dialog', { name: 'Workspace settings' })).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('dialog', { name: 'Workspace settings' })).toBeHidden();
});

test('toast: announced in a polite status region, dismissible, does not take focus, action works', async ({ page }) => {
  await expect(page.locator('#toaster').getByRole('status')).toHaveCount(1);
  await page.getByRole('button', { name: 'Save draft' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#toaster')).toContainText('Draft saved');
  expect(await deepActive(page)).toBe('toast-btn');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.locator('#toaster')).toContainText('Draft restored');
  await page.getByRole('button', { name: 'Show sticky toast' }).click();
  const dismiss = page.getByRole('button', { name: 'Dismiss notification' });
  await expect(dismiss.first()).toBeVisible();
  const before = await dismiss.count();
  await dismiss.first().click();
  await expect(dismiss).toHaveCount(before - 1);
});

test('toast: auto-dismiss pauses while hovered', async ({ page }) => {
  await page.clock.install();
  await page.evaluate(() => document.getElementById('toaster').show({ message: 'Quick note', duration: 600 }));
  const toast = page.locator('#toaster').getByText('Quick note');
  await toast.hover();
  await page.clock.runFor(900);
  await expect(toast).toBeVisible();
  await page.mouse.move(0, 0);
  await page.clock.runFor(600);
  await expect(toast).toBeHidden();
});

test('accordion: headings with expandable buttons and labelled regions; single mode; arrow keys between headers', async ({ page }) => {
  const billing = page.getByRole('button', { name: 'Billing' });
  await expect(page.getByRole('heading', { name: 'Billing', level: 3 })).toBeVisible();
  await expect(billing).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('region', { name: 'Billing' })).toBeVisible();
  await page.getByRole('button', { name: 'Members' }).click();
  await expect(page.getByRole('region', { name: 'Members' })).toBeVisible();
  await expect(billing).toHaveAttribute('aria-expanded', 'false');
  await billing.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('button', { name: 'Members' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('button', { name: 'Data export' })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(billing).toBeFocused();
});

test('disclosure: button toggles a panel and fires toggle', async ({ page }) => {
  const button = page.getByRole('button', { name: 'Show advanced options' });
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByText('Webhook retries: 3')).toBeHidden();
  await button.click();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('Webhook retries: 3')).toBeVisible();
});

for (const { name, host, trigger } of [
  { name: 'popover', host: '#pop', trigger: '#pop-trigger' },
  { name: 'menu', host: '#menu', trigger: '#menu-trigger' },
]) {
  test(`${name}: a pointer click on the trigger toggles it closed when open; a dragged-off press never leaves a stale toggle`, async ({
    page,
  }) => {
    const el = page.locator(host);
    const button = page.locator(trigger);
    await button.click();
    await expect(el).toHaveAttribute('open', '');
    await button.click();
    await expect(el).not.toHaveAttribute('open', '');
    await button.click();
    await expect(el).toHaveAttribute('open', '');

    // Press the trigger of the open popup (light dismiss closes it), drag off and release: no click.
    const box = /** @type {{ x: number, y: number, width: number, height: number }} */ (await button.boundingBox());
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height + 200);
    await page.mouse.up();
    await expect(el).not.toHaveAttribute('open', '');

    // Keyboard activation must open it, not "close" the already-closed popup.
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(el).toHaveAttribute('open', '');
  });
}

test('drawer: enters from its own edge for every placement and direction (Q17)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  /** Start of the enter motion: the dialog's transform with every animation paused at 0. */
  const startShift = (placement, dir) =>
    page.locator('#dr').evaluate(
      async (el, [p, d]) => {
        document.documentElement.dir = d;
        el.setAttribute('placement', p);
        el.open = true;
        await el.updateComplete;
        const dialog = el.shadowRoot.querySelector('[part~="dialog"]');
        const animations = dialog.getAnimations();

        for (const a of animations) {
          a.pause();
          a.currentTime = 0;
        }

        const m = new DOMMatrixReadOnly(getComputedStyle(dialog).transform);

        for (const a of animations) a.finish();
        el.open = false;
        await el.updateComplete;
        document.documentElement.dir = 'ltr';

        return { x: Math.sign(Math.round(m.m41)), y: Math.sign(Math.round(m.m42)), moving: animations.length > 0 };
      },
      [placement, dir],
    );

  expect(await startShift('end', 'ltr')).toEqual({ x: 1, y: 0, moving: true });
  expect(await startShift('end', 'rtl')).toEqual({ x: -1, y: 0, moving: true });
  expect(await startShift('start', 'ltr')).toEqual({ x: -1, y: 0, moving: true });
  expect(await startShift('start', 'rtl')).toEqual({ x: 1, y: 0, moving: true });
  expect(await startShift('bottom', 'ltr')).toEqual({ x: 0, y: 1, moving: true });
});
