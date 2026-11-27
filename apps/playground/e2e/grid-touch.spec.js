import { expect, test } from './fixtures/test.js';

test.use({ hasTouch: true, isMobile: true, viewport: { width: 412, height: 900 } });

test('column menu buttons are visible on touch screens (no hover to reveal them)', async ({ page, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox does not support isMobile');
  await page.goto('/grid.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-data-grid')));
  const button = page.locator('#invoices').getByRole('button', { name: 'Column options for Customer' });
  await expect(button).toHaveCSS('opacity', '1');
});
