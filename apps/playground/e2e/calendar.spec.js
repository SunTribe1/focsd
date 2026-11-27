import { expect, test } from './fixtures/test.js';

// Re-homed from review-fixes-10.spec.js (Q48).

test('disabled calendar navigation looks disabled', async ({ page }) => {
  await page.goto('/polish.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-calendar')));
  const cursor = await page.locator('#p-cal [part~="previous"]').evaluate((el) => getComputedStyle(el).cursor);
  expect(cursor).toBe('not-allowed');
});
