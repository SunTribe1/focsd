import { expect, test } from './fixtures/test.js';

const CONTROLS = [
  'pt-name',
  'pt-notes',
  'pt-qty',
  'pt-terms',
  'pt-alerts',
  'pt-region',
  'pt-country',
  'pt-plan',
  'pt-vol',
  'pt-stars',
  'pt-date',
  'pt-time',
  'pt-file',
  'pt-otp',
  'pt-align',
  'pt-tags',
  'pt-range',
];

test.beforeEach(async ({ page }) => {
  await page.goto('/parity.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-date-range-picker')));
});

test('setCustomValidity works like a native control on every form control', async ({ page }) => {
  const results = await page.evaluate((ids) => {
    return ids.map((id) => {
      const el = document.getElementById(id);
      el.setCustomValidity('Not allowed here.');
      const set = { valid: el.checkValidity(), message: el.validationMessage, custom: el.validity.customError };
      el.setCustomValidity('');

      return { id, set, cleared: el.validity.customError };
    });
  }, CONTROLS);

  for (const r of results) {
    expect(r.set, r.id).toEqual({ valid: false, message: 'Not allowed here.', custom: true });
    expect(r.cleared, r.id).toBe(false);
  }
});

test('a custom error blocks submission and survives re-renders', async ({ page }) => {
  await page.evaluate(() => document.getElementById('pt-name').setCustomValidity('Name is taken.'));
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Grace');
  await page.locator('#pt-submit').click();
  await expect(page.locator('#pt-result')).toHaveText('');
  expect(await page.evaluate(() => document.getElementById('pt-name').validationMessage)).toBe('Name is taken.');
});

test('labels lists associated <label> elements', async ({ page }) => {
  expect(await page.evaluate(() => [...document.getElementById('pt-name').labels].map((l) => l.textContent))).toEqual(['External label']);
});

test('readonly: forwarded to the inner input, not editable, barred from validation', async ({ page }) => {
  const field = page.getByRole('textbox', { name: 'Account number' });
  await expect(field).toHaveAttribute('readonly', '');
  await expect(field).not.toBeEditable();
  expect(
    await page.evaluate(() => {
      const el = document.getElementById('pt-ro');

      return [el.readOnly, el.willValidate, el.checkValidity()];
    }),
  ).toEqual([true, false, true]);
});

test('defaultValue and defaultChecked behave like native and drive form reset', async ({ page }) => {
  const state = await page.evaluate(async () => {
    const name = document.getElementById('pt-name');
    const terms = document.getElementById('pt-terms');
    const before = [name.defaultValue, terms.defaultChecked];
    name.value = 'Grace';
    name.defaultValue = 'Linus';
    terms.checked = false;
    await name.updateComplete;

    return before;
  });

  expect(state).toEqual(['Ada', true]);
  await page.locator('#pt-reset').click();
  expect(await page.evaluate(() => [document.getElementById('pt-name').value, document.getElementById('pt-terms').checked])).toEqual([
    'Linus',
    true,
  ]);
});

test('host aria-label and aria-describedby reach the inner control', async ({ page }) => {
  const field = page.getByRole('textbox', { name: 'Override name' });
  await expect(field).toBeVisible();
  await expect(field).toHaveAccessibleDescription('Described from outside the component.');
});
