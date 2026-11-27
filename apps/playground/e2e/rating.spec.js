import { expect, test } from './fixtures/test.js';
import { openFromParityReviewFixes } from './fixtures/pages.js';

// Re-homed from parity-review-fixes.spec.js (Q48).

test('rating keeps its readonly property', async ({ page }) => {
  await openFromParityReviewFixes(page);

  const r = await page.evaluate(async () => {
    const el = document.getElementById('pt-stars');
    el.readonly = true;
    await el.updateComplete;

    return [el.readOnly, el.hasAttribute('readonly')];
  });

  expect(r).toEqual([true, true]);
});
