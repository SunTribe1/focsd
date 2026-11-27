import { expect, test } from '@playwright/test';

// The chat guide's live demo runs the scripted transport on the page: no server, no key.

test('the scripted chat answers a suggestion with markdown, and Stop ends a reply', async ({ page }) => {
  const errors = [];

  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/guides/chat-ui/');
  await page.waitForFunction(() => customElements.get('focsd-chat-thread') && customElements.get('focsd-composer'));

  await page.getByRole('button', { name: 'Explain streaming markdown' }).click();

  const reply = page.locator('focsd-chat-message[from="assistant"]').first();

  await expect(reply.getByRole('listitem')).toHaveCount(2);
  await expect(reply.locator('pre code')).toContainText('chat.send');
  await expect(page.locator('focsd-chat-message article[aria-busy="true"]')).toHaveCount(0);

  await page.getByRole('textbox', { name: 'Message' }).fill('Say something');
  await page.getByRole('textbox', { name: 'Message' }).press('Enter');
  await page.getByRole('button', { name: 'Stop' }).click();
  await expect(page.getByRole('button', { name: 'Send' })).toBeVisible();
  await expect(page.getByText('Response stopped').first()).toBeVisible();
  expect(errors).toEqual([]);
});
