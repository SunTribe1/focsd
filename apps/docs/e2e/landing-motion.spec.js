import { expect, test } from '@playwright/test';

// The landing with motion allowed: cards rise in once.

test('cards rise in once as they scroll into view, then stay put', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('.lp-card-notify');
  await card.scrollIntoViewIfNeeded();
  await expect.poll(() => card.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
});
