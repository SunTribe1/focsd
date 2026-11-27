import { expect, test } from './fixtures/test.js';
import { openFromReviewFixes, mountInMain as mount, openFromMinorsForms } from './fixtures/pages.js';
import { expectFloorFocusRing } from './fixtures/focus-ring.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => customElements.get('focsd-text-field'));
});

test('exposes labelled textboxes with values and disabled state', async ({ page }) => {
  await expect(page.locator('#tf-form')).toMatchAriaSnapshot(`
    - textbox "Workspace name": Northwind Studio
    - textbox "Billing email"
    - textbox "Workspace ID" [disabled]: ws_0042
  `);
});

test('hint and error are announced as descriptions; error sets aria-invalid', async ({ page }) => {
  await expect(page.getByRole('textbox', { name: 'Workspace name' })).toHaveAccessibleDescription('Shown on invoices and invitations.');
  const coupon = page.getByRole('textbox', { name: 'Coupon code' });
  await expect(coupon).toHaveAccessibleDescription(/expired on 1 October/);
  await expect(coupon).toHaveAttribute('aria-invalid', 'true');
});

test('clicking the label focuses the input', async ({ page }) => {
  await page.locator('#tf-email').getByText('Billing email').click();
  await expect(page.getByRole('textbox', { name: 'Billing email' })).toBeFocused();
});

test('typing updates value and fires input; blur fires change on the host', async ({ page }) => {
  await page.evaluate(() => {
    const el = document.getElementById('tf-email');
    window.events = [];
    el.addEventListener('input', () => window.events.push('input'));
    el.addEventListener('change', () => window.events.push('change'));
  });
  await page.getByRole('textbox', { name: 'Billing email' }).fill('billing@northwind.example');
  await page.getByRole('textbox', { name: 'Billing email' }).blur();
  expect(await page.evaluate(() => document.getElementById('tf-email').value)).toBe('billing@northwind.example');
  const events = await page.evaluate(() => window.events);
  expect(events).toContain('input');
  expect(events).toContain('change');
});

test('required empty field blocks submit; valid form submits FormData without disabled fields', async ({ page }) => {
  await page.locator('#tf-submit').click();
  await expect(page.locator('#tf-result')).toHaveText('');
  expect(await page.evaluate(() => document.getElementById('tf-email').validity.valueMissing)).toBe(true);
  await page.getByRole('textbox', { name: 'Billing email' }).fill('billing@northwind.example');
  await page.locator('#tf-submit').click();
  await expect(page.locator('#tf-result')).toHaveText('{"workspace":"Northwind Studio","email":"billing@northwind.example"}');
});

test('invalid email format blocks submit', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Billing email' }).fill('not-an-email');
  await page.locator('#tf-submit').click();
  await expect(page.locator('#tf-result')).toHaveText('');
  expect(await page.evaluate(() => document.getElementById('tf-email').validity.typeMismatch)).toBe(true);
});

test('reset restores the initial value', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Workspace name' }).fill('Changed');
  await page.locator('#tf-reset').click();
  await expect(page.getByRole('textbox', { name: 'Workspace name' })).toHaveValue('Northwind Studio');
  expect(await page.evaluate(() => document.getElementById('tf-name').value)).toBe('Northwind Studio');
});

test('an invalid field still shows the focus ring when focused', async ({ page }) => {
  const coupon = page.getByRole('textbox', { name: 'Coupon code' });
  await coupon.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(coupon).toBeFocused();
  await expectFloorFocusRing(coupon);
});

// Re-homed from review-fixes.spec.js (Q48).

test('Enter in a text field submits its form', async ({ page }) => {
  await openFromReviewFixes(page);
  await page.getByRole('textbox', { name: 'Billing email' }).fill('billing@northwind.example');
  await page.getByRole('textbox', { name: 'Billing email' }).press('Enter');
  await expect(page.locator('#tf-result')).toHaveText(/billing@northwind.example/);
});

test('native constraint failure on submit sets aria-invalid, fixing it clears it', async ({ page }) => {
  await openFromReviewFixes(page);
  const email = page.getByRole('textbox', { name: 'Billing email' });
  await expect(email).not.toHaveAttribute('aria-invalid', 'true');
  await page.locator('#tf-submit').click();
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  await email.fill('billing@northwind.example');
  await expect(email).not.toHaveAttribute('aria-invalid', 'true');
});

// Re-homed from review-fixes-6.spec.js (Q48).

// Fixes found while building the docs site.
test('a text field without an error does not show the error border', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => customElements.get('focsd-text-field'));

  const border = (id) =>
    page.locator(id).evaluate((el) => getComputedStyle(el.shadowRoot.querySelector('[part~="control"]')).borderTopWidth);

  expect(await border('#tf-name')).toBe('1px');
  // The invalid border keeps its 1px weight and turns critical (the message and its icon carry the error).
  expect(await border('#tf-error')).toBe('1px');
});

// Re-homed from minors-forms.spec.js (Q48).

test('removing a host aria-label restores the visible label as the name', async ({ page }) => {
  await openFromMinorsForms(page);
  await mount(page, '<focsd-text-field id="tf" label="Name" aria-label="Override"></focsd-text-field>');
  await expect(page.getByRole('textbox', { name: 'Override' })).toBeVisible();
  await page.locator('#tf').evaluate((el) => el.removeAttribute('aria-label'));
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toBeVisible();
});

test('spellcheck on the host reaches the input and reads back as a boolean', async ({ page }) => {
  await openFromMinorsForms(page);
  await mount(page, '<focsd-text-field id="sp" label="Notes" spellcheck="false"></focsd-text-field>');
  expect(await page.locator('#sp').evaluate((el) => el.spellcheck)).toBe(false);
  expect(await page.getByRole('textbox', { name: 'Notes' }).evaluate((el) => el.spellcheck)).toBe(false);
  await page.locator('#sp').evaluate((el) => {
    el.spellcheck = true;

    return el.updateComplete;
  });
  expect(await page.getByRole('textbox', { name: 'Notes' }).evaluate((el) => el.spellcheck)).toBe(true);
});
