import { expect, test } from './fixtures/test.js';
import { openNavigationPageFromReviewFixes3 } from './fixtures/pages.js';

// Re-homed from review-fixes-3.spec.js (Q48).

test('pagination keeps focus on Next when it reaches the last page', async ({ page }) => {
  await openNavigationPageFromReviewFixes3(page);
  await page.locator('#pg').evaluate((el) => {
    el.page = 11;
  });
  const next = page.getByRole('button', { name: 'Next page' });
  await next.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#pg-result')).toHaveText('12');
  await expect(next).toHaveAttribute('aria-disabled', 'true');
  await expect(next).toBeFocused();
});
