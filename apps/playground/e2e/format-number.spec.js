import { expect, test } from './fixtures/test.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/format.html');
  await page.waitForFunction(() => customElements.get('focsd-format-number'));
});

const data = (page, id) => page.locator(`#${id} data`);

test('renders a data element whose value is the raw number', async ({ page }) => {
  await expect(data(page, 'n1')).toHaveText('1,234.5');
  await expect(data(page, 'n1')).toHaveAttribute('value', '1234.5');
  await expect(data(page, 'n2')).toHaveText('1.234,50 €');
  await expect(data(page, 'n3')).toHaveText('1.5 kB');
  await expect(data(page, 'n4')).toHaveText(/1\.5 KiB/);
});

test('without locale it follows the nearest lang', async ({ page }) => {
  await expect(data(page, 'n6')).toHaveText(/1\s234,5/);
});

test('a non-number renders nothing', async ({ page }) => {
  await expect(data(page, 'n5')).toHaveText('');
});

test('an empty value attribute renders nothing, as an empty value property does', async ({ page }) => {
  await page.locator('#n1').evaluate(async (el) => {
    el.setAttribute('value', '');
    await el.updateComplete;
  });
  await expect(data(page, 'n1')).toHaveText('');
  await page.locator('#n1').evaluate(async (el) => {
    el.setAttribute('value', ' 42 ');
    await el.updateComplete;
  });
  await expect(data(page, 'n1')).toHaveText('42');
});

test('updates when value changes', async ({ page }) => {
  await page.locator('#n1').evaluate(async (el) => {
    el.value = '99';
    await el.updateComplete;
  });
  await expect(data(page, 'n1')).toHaveText('99');
});

for (const theme of THEMES)
  test(`axe-clean in the ${theme} theme`, async ({ page }) => {
    await gotoInTheme(page, '/format.html', theme, 'focsd-format-number');
    await expectAxeClean(page);
  });
