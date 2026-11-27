import { expect, test } from './fixtures/test.js';
import { mountFixture as mount, openFromReviewFixes2 } from './fixtures/pages.js';

// Re-homed from review-fixes-2.spec.js (Q48).

test('error summary links focus controls without delegatesFocus (radio group)', async ({ page }) => {
  await openFromReviewFixes2(page);
  await mount(
    page,
    `<focsd-error-summary id="es2"></focsd-error-summary>
    <focsd-radio-group id="rg2" label="Billing cycle"><focsd-radio value="m">Monthly</focsd-radio><focsd-radio value="y">Yearly</focsd-radio></focsd-radio-group>`,
  );
  await page.evaluate(() => {
    document.getElementById('es2').errors = [{ field: 'rg2', message: 'Choose a billing cycle' }];
  });
  await page.getByRole('link', { name: 'Choose a billing cycle' }).click();
  await expect(page.getByRole('radio', { name: 'Monthly' })).toBeFocused();
});
