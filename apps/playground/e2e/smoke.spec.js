import { expect, test } from './fixtures/test.js';

test('playground loads with tokens, fonts and no console errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => (m.type() === 'error' || /Multiple versions of Lit/.test(m.text())) && errors.push(m.text()));

  for (const path of ['/inputs.html', '/data.html', '/overlays.html']) await page.goto(path);
  await page.goto('/');
  await expect(page).toHaveTitle('Focsd test bench');
  await expect(page.getByRole('heading', { level: 1, name: 'Focsd test bench' })).toBeVisible();
  const ground = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--focsd-ground').trim());
  expect(ground).not.toBe('');
  expect(errors).toEqual([]);
});
