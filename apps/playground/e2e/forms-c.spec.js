import { expect, test } from './fixtures/test.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/forms.html');
  await page.waitForFunction(() =>
    [
      'focsd-slider',
      'focsd-error-summary',
      'focsd-toggle',
      'focsd-toggle-group',
      'focsd-icon-button',
      'focsd-button-group',
      'focsd-rating',
    ].every((t) => customElements.get(t)),
  );
});

test('slider: named slider with value text, keys and bounds', async ({ page }) => {
  const slider = page.getByRole('slider', { name: 'Volume' });
  await expect(slider).toHaveAttribute('aria-valuenow', '40');
  await expect(slider).toHaveAttribute('aria-valuetext', '40%');
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveAttribute('aria-valuenow', '41');
  await page.keyboard.press('PageDown');
  await expect(slider).toHaveAttribute('aria-valuenow', '31');
  await page.keyboard.press('Home');
  await expect(slider).toHaveAttribute('aria-valuenow', '0');
  await page.keyboard.press('ArrowLeft');
  await expect(slider).toHaveAttribute('aria-valuenow', '0');
  await page.keyboard.press('End');
  expect(await page.locator('#sl').evaluate((el) => el.value)).toBe(100);
});

test('slider: pointer on the track moves the value', async ({ page }) => {
  await page.locator('#sl').scrollIntoViewIfNeeded();

  const box = await page.locator('#sl').evaluate((el) => {
    const r = el.shadowRoot.querySelector('[part~="track"]').getBoundingClientRect();

    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });

  await page.mouse.click(box.x + box.width * 0.75, box.y + box.height / 2);
  await expect(page.getByRole('slider', { name: 'Volume' })).not.toHaveAttribute('aria-valuenow', '40');
  const now = Number(await page.getByRole('slider', { name: 'Volume' }).getAttribute('aria-valuenow'));
  expect(now).toBeGreaterThanOrEqual(70);
  expect(now).toBeLessThanOrEqual(80);
});

test('range slider: two named thumbs that cannot cross', async ({ page }) => {
  const low = page.getByRole('slider', { name: 'Minimum Price' });
  const high = page.getByRole('slider', { name: 'Maximum Price' });
  await expect(low).toHaveAttribute('aria-valuetext', '€20');
  await expect(high).toHaveAttribute('aria-valuenow', '80');
  await low.focus();
  await page.keyboard.press('End');
  await expect(low).toHaveAttribute('aria-valuenow', '80');
  await expect(low).toHaveAttribute('aria-valuemax', '80');
});

test('rating: radiogroup of named stars with roving arrows; readonly is an image', async ({ page }) => {
  await expect(page.getByRole('radiogroup', { name: 'Rate this template' })).toBeVisible();
  const three = page.getByRole('radio', { name: '3 stars' });
  await expect(three).toBeChecked();
  await three.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: '4 stars' })).toBeChecked();
  await expect(page.getByRole('radio', { name: '4 stars' })).toBeFocused();
  await expect(page.getByRole('img', { name: 'Average rating: 4 out of 5' })).toBeVisible();
});

test('toggle: aria-pressed toggles; toggle group is a named group with single selection and roving focus', async ({ page }) => {
  const bold = page.getByRole('button', { name: 'Bold' });
  await expect(bold).toHaveAttribute('aria-pressed', 'false');
  await bold.click();
  await expect(bold).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('group', { name: 'Text alignment' })).toBeVisible();
  const left = page.getByRole('button', { name: 'Left' });
  await expect(left).toHaveAttribute('aria-pressed', 'true');
  await left.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button', { name: 'Center' })).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Center' })).toHaveAttribute('aria-pressed', 'true');
  await expect(left).toHaveAttribute('aria-pressed', 'false');
  expect(await page.locator('#tgg').evaluate((el) => el.value)).toBe('center');
});

test('icon button is named by its label; button group is a named group', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Delete file' })).toBeVisible();
  await expect(page.locator('#bg')).toMatchAriaSnapshot(`
    - group "Pagination":
      - button "Previous"
      - button "Next"
  `);
});

test('error summary: focuses on errors with links that focus the field', async ({ page }) => {
  await page.locator('#tools-submit').click();
  const summary = page.getByRole('alert');
  await expect(summary).toContainText('There is a problem');
  await expect(page.locator('#es')).toBeFocused();
  await page.getByRole('link', { name: 'Enter a team name' }).click();
  await expect(page.getByRole('textbox', { name: 'Team name' })).toBeFocused();
  await page.getByRole('textbox', { name: 'Team name' }).fill('Platform');
  await page.locator('#tools-submit').click();
  await expect(page.locator('#tools-result')).toHaveText(/"team":"Platform"/);
  await expect(page.locator('#tools-result')).toHaveText(/"price":\["20","80"\]/);
  await expect(page.getByRole('alert')).toHaveCount(0);
});
