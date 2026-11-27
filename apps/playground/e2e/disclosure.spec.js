import { expect, ready, test } from './fixtures/test.js';
import { record, recorded } from './fixtures/dom.js';
import { mountInMain as mount, openFromMinorsForms } from './fixtures/pages.js';

// Re-homed from minors-forms.spec.js (Q48).

test('an open disclosure inserted into a group closes itself, like <details name>', async ({ page }) => {
  await openFromMinorsForms(page);
  await mount(page, '<focsd-disclosure id="d1" name="g" open label="One">1</focsd-disclosure>');
  await mount(page, '<focsd-disclosure id="d2" name="g" open label="Two">2</focsd-disclosure>');
  expect(await page.locator('#d1').evaluate((el) => el.open)).toBe(true);
  expect(await page.locator('#d2').evaluate((el) => el.open)).toBe(false);
});

// Re-homed from final-minors.spec.js (Q48).

// Ruling: state events (open, close, toggle) fire whenever the element opens or closes, however it
// happened, like <details> toggle and <dialog> close. Value events (change, input,
// focsd-snap-change, select) fire only for the person's actions, like native form controls.
test('a disclosure fires toggle once when opened from script, and once per click', async ({ page }) => {
  await page.goto('/overlays.html');
  await ready(page, 'focsd-disclosure');
  await record(page, '#disc', ['toggle']);
  await page.locator('#disc').evaluate((el) => (el.open = true));
  await expect.poll(() => recorded(page)).toEqual(['toggle']);
  await page.getByRole('button', { name: 'Show advanced options' }).click();
  await expect.poll(() => recorded(page)).toEqual(['toggle', 'toggle']);
  await expect(page.locator('#disc')).not.toHaveAttribute('open');
});
