import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { components } from '../src/data/catalogue.js';

// The components index is a gallery: a card per component with a live, inert thumbnail, and a bar
// that re-themes every thumbnail at once.

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const stage = (page) => page.locator('[data-gp-stage]');

test.beforeEach(async ({ page }) => {
  await page.goto('/components/');
  await page.waitForFunction(() => customElements.get('focsd-button') && customElements.get('focsd-theme-toggle'));
});

test('every component has a card with a live thumbnail hidden from assistive technology', async ({ page }) => {
  const errors = [];

  page.on('pageerror', (error) => errors.push(error.message));
  await expect(page.locator('[data-gp-card]')).toHaveCount(components.length);

  const report = await page.evaluate(() =>
    [...document.querySelectorAll('[data-gp-card]')].flatMap((card) => {
      const thumb = card.querySelector('.gp-thumb');

      const undefinedTags = [...thumb.querySelectorAll('*')].filter(
        (el) => el.localName.startsWith('focsd-') && !customElements.get(el.localName),
      );

      return thumb.inert && thumb.getAttribute('aria-hidden') === 'true' && thumb.childElementCount > 0 && undefinedTags.length === 0
        ? []
        : [card.getAttribute('data-gp-card')];
    }),
  );

  expect(report).toEqual([]);
  expect(errors).toEqual([]);
});

test('the bar applies a preset, a density and a theme to the gallery only', async ({ page }) => {
  const actionOf = () =>
    page
      .locator('[data-gp-card="button"] focsd-button[variant="action"]')
      .evaluate((el) => getComputedStyle(el).getPropertyValue('--focsd-action').trim());

  const before = await actionOf();

  await page.locator('.gp-preset').evaluate((el) => {
    el.value = 'signal';
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(stage(page)).toHaveAttribute('data-focsd-brand', 'signal');
  await expect.poll(actionOf).not.toBe(before);
  await expect(page.locator('html')).not.toHaveAttribute('data-focsd-brand', /.+/);

  await page.locator('.gp-density').evaluate((el) => {
    el.value = 'compact';
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(stage(page)).toHaveAttribute('data-focsd-density', 'compact');

  await page.locator('.gp-theme').getByRole('radio', { name: 'Light' }).click();
  await expect(stage(page)).toHaveAttribute('data-focsd-theme', 'light');
});

test('a card opens its component page', async ({ page }) => {
  await page.locator('[data-gp-card="select"] .gp-name').click();
  await expect(page).toHaveURL(/\/components\/select\/$/);
});

for (const scheme of ['dark', 'light']) {
  test(`no WCAG 2.2 AA violations, ${scheme} color scheme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.reload();
    await page.waitForFunction(() => customElements.get('focsd-button'));
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(
      results.violations.map(
        (v) =>
          `${v.id}: ${v.nodes
            .map((n) => n.target.join(' '))
            .slice(0, 3)
            .join(', ')}`,
      ),
    ).toEqual([]);
  });
}
