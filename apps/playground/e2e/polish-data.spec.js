import { expect, test } from './fixtures/test.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/polish.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-carousel')));
});

test('allow-custom: typing an option label exactly selects that option', async ({ page }) => {
  await page.locator('#p-cb input').fill('germany');
  await page.locator('#p-cb input').press('Enter');
  expect(await page.evaluate(() => document.getElementById('p-cb').value)).toBe('de');
  await page.locator('#p-cb input').fill('Narnia');
  await page.locator('#p-cb input').press('Enter');
  expect(await page.evaluate(() => document.getElementById('p-cb').value)).toBe('Narnia');
});

test('a table that does not scroll adds no tab stop', async ({ page }) => {
  await expect(page.locator('#p-table [part~="viewport"]')).not.toHaveAttribute('tabindex');
  await page.setViewportSize({ width: 320, height: 700 });
  await page.evaluate(async () => {
    const t = document.getElementById('p-table');
    t.columns = Array.from({ length: 12 }, (_, i) => ({ key: `c${i}`, label: `Column number ${i}` }));
    t.rows = [Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`c${i}`, 'x'.repeat(40)]))];
    await t.updateComplete;
  });
  await expect(page.locator('#p-table [part~="viewport"]')).toHaveAttribute('tabindex', '0');
});

test('carousel index set out of range wraps into range', async ({ page }) => {
  const index = await page.evaluate(async () => {
    const el = document.getElementById('p-car');
    el.index = 7;
    await el.updateComplete;

    return el.index;
  });

  expect(index).toBe(1);
});
