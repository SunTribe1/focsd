import { expect, test } from './fixtures/test.js';
import { openFromParityReviewFixes } from './fixtures/pages.js';

// Re-homed from parity-review-fixes.spec.js (Q48).

test('removing rel from a link does not break rendering', async ({ page }) => {
  await openFromParityReviewFixes(page);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.evaluate(async () => {
    const el = document.getElementById('pt-rel-link');
    el.removeAttribute('rel');
    await el.updateComplete.catch(() => {});
    el.href = '/b';
    await el.updateComplete.catch(() => {});
  });
  await expect(page.locator('#pt-rel-link a')).toHaveAttribute('href', '/b');
  await expect(page.locator('#pt-rel-link a')).toHaveAttribute('rel', 'noopener');
  expect(errors).toEqual([]);
});
