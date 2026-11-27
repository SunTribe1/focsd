import { expect, ready, test } from './fixtures/test.js';
import { openOverlaysPageFromReviewFixes3 } from './fixtures/pages.js';
import { expectFloorFocusRing } from './fixtures/focus-ring.js';

// Re-homed from review-fixes-3.spec.js (Q48).

test('accordion triggers use the floor focus ring', async ({ page }) => {
  await openOverlaysPageFromReviewFixes3(page);
  await page.getByRole('button', { name: 'Billing' }).focus();
  await page.keyboard.press('ArrowDown');
  await expectFloorFocusRing(page.getByRole('button', { name: 'Members' }));
});

// Re-homed from final-minors.spec.js (Q48).

test('an accordion item opened from script closes the others (toggle reaches the accordion)', async ({ page }) => {
  await page.goto('/overlays.html');
  await ready(page, 'focsd-accordion');
  const items = page.locator('#acc focsd-accordion-item');
  await expect(items.nth(0)).toHaveAttribute('open');
  await items.nth(1).evaluate((el) => (el.open = true));
  await expect(items.nth(0)).not.toHaveAttribute('open');
  await expect(items.nth(1)).toHaveAttribute('open');
});
