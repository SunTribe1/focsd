import { expect, test } from './fixtures/test.js';

test('a date picker exposes its calendar parts as calendar-*', async ({ page }) => {
  await page.goto('/parity.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-date-picker')));
  await page.addStyleTag({ content: 'focsd-date-picker::part(calendar-day) { outline: 3px solid rgb(255, 0, 0); }' });
  await page.evaluate(() => document.getElementById('pt-date').showPicker());

  const color = await page.evaluate(async () => {
    const calendar = document.getElementById('pt-date').shadowRoot.querySelector('[part~="calendar"]');
    await calendar.updateComplete;

    return getComputedStyle(calendar.shadowRoot.querySelector('[part~="day"]')).outlineColor;
  });

  expect(color).toBe('rgb(255, 0, 0)');
});

test('the data grid exposes its pagination parts as pagination-*', async ({ page }) => {
  await page.goto('/data.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-data-grid')));
  await page.addStyleTag({ content: 'focsd-data-grid::part(pagination-page) { outline: 3px solid rgb(255, 0, 0); }' });

  const color = await page.evaluate(async () => {
    const grid = document.getElementById('grid');
    await grid.updateComplete;
    const pagination = grid.shadowRoot.querySelector('focsd-pagination');
    await pagination.updateComplete;

    return getComputedStyle(pagination.shadowRoot.querySelector('[part~="page"]')).outlineColor;
  });

  expect(color).toBe('rgb(255, 0, 0)');
});
