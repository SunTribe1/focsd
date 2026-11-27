import { expect, test } from '@playwright/test';

test('component examples register and render in this engine', async ({ page }) => {
  await page.goto('/components/dialog/');
  await page.waitForFunction(() => customElements.get('focsd-dialog'));
  const opener = page.locator('[data-example]').getByRole('button', { name: 'Remove member' });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'Remove Lukas Brandt?' });
  await expect(dialog).toBeVisible();
  // The modal is named by its headline; Escape closes it and focus goes back to the opener.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect
    .poll(() => page.locator('[data-example] focsd-button[commandfor="dialog-demo"]').evaluate((el) => el.matches(':focus-within')))
    .toBe(true);
});
