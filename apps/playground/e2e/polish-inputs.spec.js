import { expect, test } from './fixtures/test.js';
import { clickInert } from './fixtures/dom.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/polish.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-calendar')));
});

test('calendar month navigation is disabled beyond min and max', async ({ page }) => {
  const prev = page.locator('#p-cal [part~="previous"]');
  const next = page.locator('#p-cal [part~="next"]');
  await expect(prev).toHaveAttribute('aria-disabled', 'true');
  await expect(next).toHaveAttribute('aria-disabled', 'true');
  await clickInert(prev);
  await expect(page.locator('#p-cal [part~="heading"]')).toContainText('May');
});

test('a date range with only one date is invalid', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const el = document.getElementById('p-range-dates');
    el.valueStart = '2026-05-01';
    await el.updateComplete;

    return [el.validity.valid, el.validationMessage];
  });

  expect(r).toEqual([false, 'Enter an end date.']);
});

test('file upload reports rejected and extra files, in the page language', async ({ page }) => {
  const errors = await page.evaluate(async () => {
    const el = document.getElementById('p-file');
    el.addFiles([new File(['a'], 'a.pdf'), new File(['b'], 'b.pdf'), new File(['c'], 'c.txt')]);
    await el.updateComplete;

    return [...el.shadowRoot.querySelectorAll('[part~="error"]')].map((e) => e.textContent.trim());
  });

  expect(errors.join(' ')).toContain('c.txt is not an accepted file type.');
  expect(errors.join(' ')).toContain('b.pdf');
});

test('OTP cells stay left to right in right-to-left pages', async ({ page }) => {
  const dir = await page.locator('#p-otp').evaluate((el) => getComputedStyle(el.shadowRoot.querySelector('input').parentElement).direction);
  expect(dir).toBe('ltr');
});

test('switch thumb stays visible in forced colors', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit has no forced-colors mode');
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/parity.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-switch')));

  const adjust = await page
    .locator('#pt-alerts')
    .evaluate((el) => getComputedStyle(el.shadowRoot.querySelector('[part~="thumb"]')).forcedColorAdjust);

  expect(adjust).toBe('none');
});
