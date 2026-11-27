import { expect, test } from './fixtures/test.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/react.html');
  await page.waitForFunction(() => customElements.get('focsd-select') && document.querySelector('#react-ready'));
});

test('controlled TextField round-trips its value through onInput', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Project name' }).fill('Atlas');
  await expect(page.locator('#react-name')).toHaveText('Atlas');
  await page.getByRole('button', { name: 'Reset name' }).click();
  await expect(page.getByRole('textbox', { name: 'Project name' })).toHaveValue('Untitled');
});

test('Select reports changes through onChange', async ({ page }) => {
  await page.getByRole('button', { name: /^Visibility/ }).click();
  await page.getByRole('option', { name: 'Public' }).click();
  await expect(page.locator('#react-visibility')).toHaveText('public');
});

test('Tabs onChange and Button clicks reach React handlers', async ({ page }) => {
  await page.getByRole('tab', { name: 'Activity' }).click();
  await expect(page.locator('#react-tab')).toHaveText('1');
  await page.getByRole('button', { name: 'Count' }).click();
  await expect(page.locator('#react-count')).toHaveText('1');
});

test('Dialog opens from React state and reports onClose', async ({ page }) => {
  await page.getByRole('button', { name: 'Archive project' }).click();
  await page.getByRole('button', { name: 'Archive', exact: true }).click();
  await expect(page.locator('#react-dialog')).toHaveText('archive');
});

test('wrappers exist for every component, with React event props', async ({ page }) => {
  await page.getByRole('switch', { name: 'Alerts' }).click();
  await expect(page.locator('#react-alerts')).toHaveText('true');
  await page.getByRole('combobox', { name: 'Labels' }).click();
  await page.getByRole('option', { name: 'Docs' }).click();
  await expect(page.locator('#react-labels')).toHaveText('docs');
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await page.getByRole('button', { name: 'Close Notes' }).click();
  await expect(page.locator('#react-panel')).toHaveText('1');
});
