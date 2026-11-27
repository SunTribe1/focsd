import { expect, test } from './fixtures/test.js';
import { openOverlaysPageFromReviewFixes3 } from './fixtures/pages.js';

// Re-homed from review-fixes-3.spec.js (Q48).

test('tooltip stays open while the pointer moves onto it', async ({ page }) => {
  await openOverlaysPageFromReviewFixes3(page);
  await page.clock.install();
  const button = page.getByRole('button', { name: 'Copy link' });
  await button.hover();
  const tip = page.locator('#tip').locator('[role="tooltip"]');
  await expect(tip).toBeVisible();
  const box = await tip.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
  await page.clock.runFor(400);
  await expect(tip).toBeVisible();
});
