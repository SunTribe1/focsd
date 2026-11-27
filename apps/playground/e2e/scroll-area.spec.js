import { expect, test } from './fixtures/test.js';
import { openFromReviewFixes4 } from './fixtures/pages.js';

// Re-homed from review-fixes-4.spec.js (Q48).

test('max-block-size prop limits the viewport', async ({ page }) => {
  await openFromReviewFixes4(page);

  const height = await page.locator('#sa').evaluate(async (el) => {
    el.setAttribute('max-block-size', '3rem');
    await el.updateComplete;

    return getComputedStyle(el.shadowRoot.querySelector('[part~="viewport"]')).maxHeight;
  });

  expect(height).toBe('48px');
});
