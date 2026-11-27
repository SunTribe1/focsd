import { expect, test } from './fixtures/test.js';
import { mountFormInMain as mount, openFromMinorsInputs } from './fixtures/pages.js';

// Re-homed from minors-inputs.spec.js (Q48).

test('a date picker shows its error once the person leaves an invalid date', async ({ page }) => {
  await openFromMinorsInputs(page);
  await mount(page, '<focsd-date-picker id="dp" label="Due" min="2026-01-01"></focsd-date-picker>');
  const input = page.locator('#dp').getByRole('textbox', { name: 'Due' });
  await input.fill('2025-06-01');
  await expect(page.locator('#dp [part~="error"]')).toHaveCount(0);
  await input.blur();
  await expect(page.locator('#dp [part~="error"]')).toBeVisible();
});
