import { expect, test } from './fixtures/test.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';

// Close (×) buttons: dialogs and drawers have one by default, alert dialogs never, `no-close` hides
// it; alerts and popovers add one with `closable`.

const close = (locator) => locator.getByRole('button', { name: 'Close', exact: true });

test.beforeEach(async ({ page }) => {
  await page.goto('/close-buttons.html');
  await page.waitForFunction(() => window.__ready);
});

test('a dialog has a close button, last in the tab order, that asks to close like Escape', async ({ page }) => {
  const dialog = page.locator('#dialog');

  await page.getByRole('button', { name: 'Open dialog', exact: true }).click();
  await expect(close(dialog)).toBeVisible();
  // Opening focuses the content first, not the close button.
  await expect(close(dialog)).not.toBeFocused();

  await page.evaluate(() => {
    window.__cancels = 0;
    document.getElementById('dialog').addEventListener('cancel', () => (window.__cancels += 1));
  });
  await close(dialog).click();
  await expect(dialog).not.toHaveAttribute('open', '');
  expect(await page.evaluate(() => window.__cancels)).toBe(1);
  await expect(page.getByRole('button', { name: 'Open dialog', exact: true })).toBeFocused();
});

test('a drawer has a close button too', async ({ page }) => {
  await page.getByRole('button', { name: 'Open drawer' }).click();
  await close(page.locator('#drawer')).click();
  await expect(page.locator('#drawer')).not.toHaveAttribute('open', '');
});

test('an alert dialog has no close button, and no-close hides it on a dialog', async ({ page }) => {
  await page.getByRole('button', { name: 'Open alert dialog' }).click();
  await expect(close(page.locator('#alert-dialog'))).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel' }).click();

  await page.getByRole('button', { name: 'Open dialog without ×' }).click();
  await expect(close(page.locator('#no-close'))).toHaveCount(0);
});

test('a closable alert hides on close, unless its close event is cancelled', async ({ page }) => {
  await close(page.locator('#alert')).click();
  await expect(page.locator('#alert')).toBeHidden();

  await close(page.locator('#kept')).click();
  await expect(page.locator('#kept')).toBeVisible();
});

test('a closable popover closes from its button and returns focus to the trigger', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Details' });

  await trigger.click();
  await expect(page.getByText('Popover content.')).toBeVisible();
  await close(page.locator('#popover')).click();
  await expect(page.getByText('Popover content.')).toBeHidden();
  await expect(trigger).toBeFocused();
});

for (const theme of THEMES) {
  test(`close-buttons.html with an open dialog has no axe violations in ${theme}`, async ({ page }) => {
    await gotoInTheme(page, '/close-buttons.html', theme, 'focsd-dialog');
    await page.waitForFunction(() => window.__ready);
    await page.getByRole('button', { name: 'Open dialog', exact: true }).click();
    await expectAxeClean(page);
  });
}
