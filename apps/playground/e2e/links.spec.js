import { expect, test } from './fixtures/test.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/links.html');
  await page.waitForFunction(() => customElements.get('focsd-link') && customElements.get('focsd-currency-field'));
});

test('a plain click on focsd-link, a sidebar item and a breadcrumb item goes to the handler, without a page load', async ({ page }) => {
  // A marker on window disappears if the browser loads another page.
  await page.evaluate(() => {
    window.stayed = true;
  });

  await page.getByRole('link', { name: 'Reports' }).click();
  await expect(page.locator('#routed')).toHaveText('/app/reports');
  await page.getByRole('link', { name: 'Members' }).click();
  await expect(page.locator('#routed')).toHaveText('/app/members');
  await page.getByRole('link', { name: 'Projects' }).click();
  await expect(page.locator('#routed')).toHaveText('/app/projects');
  await expect(page.locator('#calls')).toHaveText('3');
  expect(new URL(page.url()).pathname).toBe('/app/projects');
  expect(await page.evaluate(() => window.stayed)).toBe(true);
});

test('pagination links and slotted footer links are routed too, and Enter on a link calls the handler', async ({ page }) => {
  await page.getByRole('link', { name: /page 2/i }).click();
  await expect(page.locator('#routed')).toHaveText('/app/list?page=2');
  await page.getByRole('link', { name: 'About' }).click();
  await expect(page.locator('#routed')).toHaveText('/app/about');
  await page.getByRole('link', { name: 'Reports' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#routed')).toHaveText('/app/reports');
  await expect(page.locator('#calls')).toHaveText('3');
});

// ControlOrMeta follows the host browser: Command on macOS, Ctrl elsewhere.
test('Ctrl or Command + click opens a new tab natively and never calls the handler', async ({ page, context }) => {
  const opened = context.waitForEvent('page');

  await page.getByRole('link', { name: 'Reports' }).click({ modifiers: ['ControlOrMeta'] });
  const tab = await opened;

  // A new tab starts on about:blank; on a slow machine it can still be there after the first load.
  await tab.waitForURL('**/app/reports');
  expect(new URL(tab.url()).pathname).toBe('/app/reports');
  await tab.close();
  await expect(page.locator('#calls')).toHaveText('0');
  expect(new URL(page.url()).pathname).toBe('/links.html');
});

test('external (new tab) and download links stay native', async ({ page, context }) => {
  // Keep the test offline: answer the external site locally.
  await context.route('https://example.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Example</title>' }),
  );
  const opened = context.waitForEvent('page');

  await page.getByRole('link', { name: /Example site/ }).click();
  (await opened).close();
  const download = page.waitForEvent('download');

  await page.getByRole('link', { name: 'Download this page' }).click();
  expect((await download).suggestedFilename()).toBe('links.html');
  await expect(page.locator('#calls')).toHaveText('0');
});

test('every routed link is still a real <a href> in the accessibility tree', async ({ page }) => {
  for (const name of ['Reports', 'Members', 'Projects', 'About']) {
    await expect(page.getByRole('link', { name })).toHaveAttribute('href', /^\/app\//);
  }
});

test('setLocale formats numbers and amounts, leaves an element with its own locale alone, and null resets', async ({ page }) => {
  const num = page.locator('#num');
  const own = page.locator('#num-own');
  const price = page.getByRole('spinbutton', { name: 'Price' });

  await expect(num).toHaveText('1,234.5');
  await page.getByRole('button', { name: 'Format in German' }).click();
  await expect(num).toHaveText('1.234,5');
  await expect(own).toHaveText('1,234.5');
  await expect(price).toHaveValue(/1\.234,50/);
  // Labels keep following lang: the field's label is still English.
  await expect(page.getByText('Price', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to the page language' }).click();
  await expect(num).toHaveText('1,234.5');
  await expect(price).toHaveValue(/1,234\.50/);
});
