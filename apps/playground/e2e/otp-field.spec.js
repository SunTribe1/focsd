import { expect, test } from './fixtures/test.js';
import { openFromReviewFixes2 } from './fixtures/pages.js';

// Re-homed from review-fixes-2.spec.js (Q48).

test('clearing an OTP cell does not shift the other digits', async ({ page }) => {
  await openFromReviewFixes2(page);
  await page.locator('#otp').evaluate((el) => {
    el.value = '123456';
  });
  const cell2 = page.getByRole('textbox', { name: 'Digit 2 of 6' });
  await cell2.fill('');
  await expect(page.getByRole('textbox', { name: 'Digit 3 of 6' })).toHaveValue('3');
  await expect(page.getByRole('textbox', { name: 'Digit 6 of 6' })).toHaveValue('6');
  await cell2.fill('9');
  expect(await page.locator('#otp').evaluate((el) => el.value)).toBe('193456');
});

test('a whole code autofilled into the first cell is spread across cells', async ({ page }) => {
  await openFromReviewFixes2(page);
  const first = page.getByRole('textbox', { name: 'Digit 1 of 6' });
  await first.evaluate((el) => {
    el.value = '482913';
    el.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
  });
  expect(await page.locator('#otp').evaluate((el) => el.value)).toBe('482913');
  await expect(page.getByRole('textbox', { name: 'Digit 4 of 6' })).toHaveValue('9');
});
