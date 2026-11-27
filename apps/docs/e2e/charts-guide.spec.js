import { expect, test } from '@playwright/test';

// The charts guide's live examples: one per chart type, a sparkline with its sentence and a gauge.

test('the charts guide draws each type with its words', async ({ page }) => {
  const errors = [];

  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/guides/charts/');
  await page.waitForFunction(() => customElements.get('focsd-chart') && customElements.get('focsd-gauge'));
  await page.evaluate(() =>
    Promise.all([...document.querySelectorAll('focsd-chart, focsd-sparkline, focsd-gauge')].map((e) => e.updateComplete)),
  );

  const words = await page.evaluate(() => ({
    area: document.getElementById('guide-area').summary,
    stacked: document.getElementById('guide-stacked').summary,
    scatter: document.getElementById('guide-scatter').summary,
    spark: document.getElementById('guide-spark').summary,
  }));

  expect(words.area).toMatch(/^Area chart, 6 categories, 3 series\. Highest: /);
  expect(words.stacked).toMatch(/^Stacked bar chart, 6 categories, 3 series\. .*Highest total: /);
  expect(words.scatter).toMatch(/^Scatter chart, 2 series, 12 points\. x from 5 to 30/);
  expect(words.spark).toBe('Signups per day: 6 values, from 4 to 19, last 17, up 325% from the first');
  await expect(page.getByRole('meter', { name: 'Disk used' })).toHaveAttribute('aria-valuetext', '72%, Warning');
  expect(errors).toEqual([]);
});
