import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('the presets page lists the default and the four presets with their attribute', async ({ page }) => {
  await page.goto('/foundations/presets/');
  const rows = page.locator('.focsd-presets-table tbody tr');
  await expect(rows).toHaveCount(5);

  for (const name of ['harbor', 'signal', 'mineral', 'prismatic'])
    await expect(page.locator(`tr[data-preset="${name}"]`)).toContainText(name);
  await expect(page.getByRole('link', { name: 'Theme presets' }).first()).toBeVisible();
});

test('the presets page has no WCAG 2.2 AA violations', async ({ page }) => {
  await page.goto('/foundations/presets/');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});

/** People press the chip (the label); the radio inside it is visually hidden. */
const choose = async (page, name) => {
  await page.locator('label', { has: page.getByRole('radio', { name }) }).click();
  await expect(page.getByRole('radio', { name })).toBeChecked();
};

test('the explorer re-brands its own stage and not the page', async ({ page }) => {
  await page.goto('/foundations/presets/');
  const stage = page.locator('#focsd-pe-stage');
  await expect(stage).not.toHaveAttribute('data-focsd-brand', /.+/);

  const action = () =>
    stage
      .locator('focsd-button')
      .first()
      .evaluate((el) => getComputedStyle(el).getPropertyValue('--focsd-action').trim());

  const before = await action();
  await choose(page, 'Signal');
  await expect(stage).toHaveAttribute('data-focsd-brand', 'signal');
  await expect(page.locator('html')).not.toHaveAttribute('data-focsd-brand', /.+/);
  expect(await action()).not.toBe(before);
  await choose(page, 'Wayfinding');
  await expect(stage).not.toHaveAttribute('data-focsd-brand', /.+/);
});
