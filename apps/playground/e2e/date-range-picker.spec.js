import { expect, test } from './fixtures/test.js';
import { mountFormInMain as mount, openFromMinorsInputs } from './fixtures/pages.js';

// Re-homed from minors-inputs.spec.js (Q48).

/** The element that has focus, looking through shadow roots. */
const deepFocus = (page) =>
  page.evaluate(() => {
    let el = document.activeElement;

    while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;

    return el?.id ?? '';
  });

test('an end date before the start date points validation at the end date', async ({ page }) => {
  await openFromMinorsInputs(page);
  await mount(
    page,
    '<focsd-date-range-picker id="rg" label="Trip" value-start="2026-05-10" value-end="2026-05-01"></focsd-date-range-picker>',
  );
  await page.locator('#rg').evaluate((el) => el.form.reportValidity());
  const endId = await page.locator('#rg').evaluate((el) => el.shadowRoot.querySelectorAll('input')[1].id);
  expect(await deepFocus(page)).toBe(endId);
});
