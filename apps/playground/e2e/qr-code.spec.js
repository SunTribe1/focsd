import { expect, test } from './fixtures/test.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/qr-code.html');
  await page.waitForFunction(() => customElements.get('focsd-qr-code'));
});

const svg = (page, id) => page.locator(`#${id} svg`);

test('an SVG image named by label, 128 px by default', async ({ page }) => {
  await expect(page.getByRole('img', { name: 'QR code for focsd.dev' })).toBeVisible();
  const box = await svg(page, 'q').boundingBox();
  expect([Math.round(box.width), Math.round(box.height)]).toEqual([128, 128]);
  expect(await svg(page, 'qh').evaluate((s) => s.getBoundingClientRect().width)).toBe(200);
});

test('a quiet zone of four modules surrounds the code', async ({ page }) => {
  await expect(svg(page, 'q')).toHaveAttribute('viewBox', '0 0 33 33'); // 25 modules + 2×4
});

test('value and error correction change the code', async ({ page }) => {
  const before = await svg(page, 'q').innerHTML();
  await page.locator('#q').evaluate(async (el) => {
    el.errorCorrection = 'H';
    await el.updateComplete;
  });
  expect(await svg(page, 'q').innerHTML()).not.toBe(before);
});

test('modules use the ink color on the surface color, and both can be overridden', async ({ page }) => {
  const [ink, fill] = await page
    .locator('#q')
    .evaluate((el) => [
      getComputedStyle(el).getPropertyValue('--focsd-ink').trim(),
      getComputedStyle(el.shadowRoot.querySelector('[part~="modules"]')).fill,
    ]);

  expect(fill).not.toBe('');
  expect(ink).not.toBe('');

  await page.locator('#q').evaluate((el) => el.style.setProperty('--focsd-qr-code-ink', 'rgb(0, 0, 0)'));
  expect(await page.locator('#q').evaluate((el) => getComputedStyle(el.shadowRoot.querySelector('[part~="modules"]')).fill)).toBe(
    'rgb(0, 0, 0)',
  );
});

test('a missing label warns once; a value too long fires focsd-error and stays a named image', async ({ page }) => {
  const log = await page.evaluate(() => window.__log);
  expect(log.filter((l) => l.type === 'warn' && l.text.startsWith('Focsd: <focsd-qr-code> needs a label'))).toHaveLength(1);
  expect(log).toContainEqual({ type: 'focsd-error', id: 'ql', reason: 'too-long' });
  await expect(page.getByRole('img', { name: 'Too long' })).toBeAttached();
});

test('forced colors keep the code black on white', async ({ page }) => {
  // A dark system palette, so system colors would draw a reversed code.
  await page.emulateMedia({ forcedColors: 'active', colorScheme: 'dark' });

  const fills = await page.locator('#q').evaluate((el) => {
    const part = (name) => getComputedStyle(el.shadowRoot.querySelector(`[part~="${name}"]`)).fill;

    return [part('modules'), part('surface')];
  });

  expect(fills).toEqual(['rgb(0, 0, 0)', 'rgb(255, 255, 255)']);
});

for (const theme of THEMES)
  test(`axe-clean in the ${theme} theme`, async ({ page }) => {
    await gotoInTheme(page, '/qr-code.html', theme, 'focsd-qr-code');
    await page.locator('#qn').evaluate((el) => el.remove()); // the unlabelled example is a deliberate mistake
    await expectAxeClean(page);
  });
