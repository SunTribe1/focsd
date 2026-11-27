import { expect, test } from './fixtures/test.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/shortcuts.html');
  // The shortcut list is filled once the page module has registered its shortcuts.
  await page.waitForFunction(() => customElements.get('focsd-command') && document.querySelector('#shortcut-list tbody tr'));
});

/** The page's own idea of "mod" (the emulated Chrome reports Windows even on a Mac host). */
const modKey = (page) =>
  page.evaluate(() => (/mac|iphone|ipad/i.test(navigator.userAgentData?.platform || navigator.platform) ? 'Meta' : 'Control'));

const palette = (page) => page.getByRole('dialog', { name: 'Command palette' });

test('mod+k opens the command palette, and Escape closes it', async ({ page }) => {
  await page.keyboard.press(`${await modKey(page)}+k`);
  await expect(palette(page)).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Command palette' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(palette(page)).toBeHidden();
});

test('mod+k typed inside a text field does not fire', async ({ page }) => {
  await page.getByLabel('Notes').focus();
  await page.keyboard.press(`${await modKey(page)}+k`);
  await expect(palette(page)).toBeHidden();
});

test('a shortcut does not fire while a focsd-dialog is open', async ({ page }) => {
  await page.getByRole('button', { name: 'Open dialog' }).click();
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
  await page.keyboard.press(`${await modKey(page)}+k`);
  await page.keyboard.press('Alt+n');
  await expect(palette(page)).toBeHidden();
  await expect(page.locator('#count')).toHaveText('0');
  // Dialogs have their own × (named Close) as well as the page's Close button: either closes it.
  await page.getByRole('dialog', { name: 'Settings' }).getByRole('button', { name: 'Close' }).first().click();
  await page.keyboard.press('Alt+n');
  await expect(page.locator('#count')).toHaveText('1');
});

test('it does not fire during IME composition or while the key is held', async ({ page }) => {
  await page.getByRole('button', { name: 'Open dialog' }).evaluate((button) => button.blur());

  const sent = await page.evaluate(() => {
    const init = { key: 'n', altKey: true, bubbles: true, composed: true, cancelable: true };
    const composing = new KeyboardEvent('keydown', { ...init, isComposing: true });
    const held = new KeyboardEvent('keydown', { ...init, repeat: true });

    document.body.dispatchEvent(composing);
    document.body.dispatchEvent(held);

    return { composing: composing.defaultPrevented, held: held.defaultPrevented };
  });

  expect(sent).toEqual({ composing: false, held: false });
  await expect(page.locator('#count')).toHaveText('0');
  await page.keyboard.press('Alt+n');
  await expect(page.locator('#count')).toHaveText('1');
});

test('a held key fires once, not on every repeat', async ({ page }) => {
  await page.keyboard.down('Alt');
  await page.keyboard.down('n');
  await page.keyboard.down('n');
  await page.keyboard.down('n');
  await page.keyboard.up('n');
  await page.keyboard.up('Alt');
  await expect(page.locator('#count')).toHaveText('1');
});

test('a single-character shortcut works only while focus is inside its scope', async ({ page }) => {
  await page.keyboard.press('j');
  await expect(page.locator('#fired')).toHaveText('none');
  await page.getByRole('group', { name: 'Board' }).focus();
  await page.keyboard.press('j');
  await expect(page.locator('#fired')).toHaveText('j');
});

test('the shortcut can be turned off, and the help list follows', async ({ page }) => {
  const rows = page.locator('#shortcut-list tbody tr');

  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toContainText('Open the command palette');
  await page.getByRole('switch', { name: 'Keep Alt + N turned on' }).click();
  await expect(rows).toHaveCount(2);
  await page.keyboard.press('Alt+n');
  await expect(page.locator('#count')).toHaveText('0');
  await page.getByRole('switch', { name: 'Keep Alt + N turned on' }).click();
  await page.keyboard.press('Alt+n');
  await expect(page.locator('#count')).toHaveText('1');
});
