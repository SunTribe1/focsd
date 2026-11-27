import { expect, test } from './fixtures/test.js';
import { clickInert } from './fixtures/dom.js';
import { openFromReviewFixes2 } from './fixtures/pages.js';

// Re-homed from review-fixes-2.spec.js (Q48).

test('a disabled toggle group disables its toggles', async ({ page }) => {
  await openFromReviewFixes2(page);
  await page.locator('#tgg').evaluate((el) => {
    el.disabled = true;
  });
  await expect(page.getByRole('button', { name: 'Center' })).toHaveAttribute('aria-disabled', 'true');
  await clickInert(page.getByRole('button', { name: 'Center' }));
  expect(await page.locator('#tgg').evaluate((el) => el.value)).toBe('left');
});
