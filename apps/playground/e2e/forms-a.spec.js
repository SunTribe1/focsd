import { expect, test } from './fixtures/test.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/forms.html');
  await page.waitForFunction(() =>
    [
      'focsd-textarea',
      'focsd-checkbox',
      'focsd-checkbox-group',
      'focsd-radio-group',
      'focsd-radio',
      'focsd-switch',
      'focsd-fieldset',
    ].every((t) => customElements.get(t)),
  );
});

const submit = async (page) => {
  await page.locator('#prefs-submit').click();

  return page.locator('#prefs-result').textContent();
};

test('textarea: labelled multiline field with a live character counter; Enter adds a newline', async ({ page }) => {
  const ta = page.getByRole('textbox', { name: 'Project description' });
  await expect(ta).toHaveAccessibleDescription(/Shown on the project overview/);
  await ta.fill('Line one');
  await ta.press('Enter');
  await ta.type('Line two');
  expect(await page.locator('#ta').evaluate((el) => el.value)).toBe('Line one\nLine two');
  await expect(page.locator('#ta').getByText('17 of 120 characters')).toBeVisible();
});

test('checkbox: named by slotted content, toggles with Space, supports mixed', async ({ page }) => {
  const terms = page.getByRole('checkbox', { name: 'I accept the terms of service' });
  await expect(terms).not.toBeChecked();
  await terms.focus();
  await page.keyboard.press('Space');
  await expect(terms).toBeChecked();
  expect(await page.locator('#cb-terms').evaluate((el) => el.checked)).toBe(true);
  await expect(page.getByRole('checkbox', { name: 'Select all reports' })).toBeChecked({ indeterminate: true });
});

test('checkbox group is a named group containing its checkboxes', async ({ page }) => {
  await expect(page.locator('#cbg')).toMatchAriaSnapshot(`
    - group "Email me about":
      - checkbox "Product releases" [checked]
      - checkbox "Security notices"
      - checkbox "Events (unavailable)" [disabled]
  `);
});

test('radio group: named radiogroup, arrows move and check, skipping disabled; one tab stop', async ({ page }) => {
  await expect(page.getByRole('radiogroup', { name: 'Plan' })).toBeVisible();
  const team = page.getByRole('radio', { name: 'Team' });
  await expect(team).toBeChecked();
  const tabindexes = await page.locator('#rg focsd-radio').evaluateAll((els) => els.map((e) => e.getAttribute('tabindex')));
  expect(tabindexes).toEqual(['-1', '0', '-1', '-1']);
  await team.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('radio', { name: 'Education' })).toBeFocused();
  await expect(page.getByRole('radio', { name: 'Education' })).toBeChecked();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('radio', { name: 'Solo' })).toBeChecked();
  expect(await page.locator('#rg').evaluate((el) => el.value)).toBe('solo');
});

test('switch: role switch with state text, toggles with Space and Enter', async ({ page }) => {
  const sw = page.getByRole('switch', { name: 'Weekly digest' });
  await expect(sw).toBeChecked();
  await sw.focus();
  await page.keyboard.press('Space');
  await expect(sw).not.toBeChecked();
  await page.keyboard.press('Enter');
  await expect(sw).toBeChecked();
  await expect(page.locator('#sw [part~="state"]')).toHaveText('On');
});

test('fieldset groups fields under a named group with a description', async ({ page }) => {
  await expect(page.getByRole('group', { name: 'Shipping address' })).toHaveAccessibleDescription('We only ship within the EU.');
  await expect(page.locator('#fs-ship')).toMatchAriaSnapshot(`
    - group "Shipping address":
      - paragraph: We only ship within the EU.
      - text: Street
      - textbox "Street"
      - text: City
      - textbox "City"
  `);
});

test('form: required checkbox blocks submit; values submit; reset restores', async ({ page }) => {
  expect(await submit(page)).toBe('');
  expect(await page.locator('#cb-terms').evaluate((el) => el.validity.valueMissing)).toBe(true);
  await page.getByRole('checkbox', { name: 'I accept the terms of service' }).check();
  await page.getByRole('radio', { name: 'Education' }).click();
  const result = JSON.parse(await submit(page));
  expect(result).toMatchObject({ terms: 'on', topics: 'releases', plan: 'education', digest: 'on' });
  await page.locator('#prefs-reset').click();
  expect(await page.locator('#rg').evaluate((el) => el.value)).toBe('team');
  expect(await page.locator('#cb-terms').evaluate((el) => el.checked)).toBe(false);
  await expect(page.getByRole('switch', { name: 'Weekly digest' })).toBeChecked();
});
