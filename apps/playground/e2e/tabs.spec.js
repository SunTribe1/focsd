import { expect, test } from './fixtures/test.js';
import { clickInert } from './fixtures/dom.js';
import { mountFixture as mount, openFromReviewFixes } from './fixtures/pages.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => customElements.get('focsd-tabs') && customElements.get('focsd-tab-panel'));
});

const selectedName = (page) => page.locator('#tabs focsd-tab[aria-selected="true"]').textContent();

test('exposes a labelled tablist, tabs with state, and the active panel', async ({ page }) => {
  await expect(page.locator('#tabs')).toMatchAriaSnapshot(`
    - tablist "Workspace settings":
      - tab "General" [selected]
      - tab "Members"
      - tab "Billing" [disabled]
      - tab "Security"
    - tabpanel "General":
      - paragraph: Name, region and default language for the workspace.
  `);
});

test('only the selected tab is in the tab order; Tab moves to the panel', async ({ page }) => {
  const tabindexes = await page.locator('#tabs focsd-tab').evaluateAll((els) => els.map((e) => e.getAttribute('tabindex')));
  expect(tabindexes).toEqual(['0', '-1', '-1', '-1']);
  await page.getByRole('tab', { name: 'General' }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('tabpanel', { name: 'General' })).toBeFocused();
});

test('arrow keys move and activate, skip disabled tabs and wrap; Home/End jump', async ({ page }) => {
  await page.getByRole('tab', { name: 'General' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Members' })).toBeFocused();
  expect(await selectedName(page)).toBe('Members');
  await expect(page.getByRole('tabpanel', { name: 'Members' })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Security' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'General' })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('tab', { name: 'Security' })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(page.getByRole('tab', { name: 'General' })).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'Security' })).toBeFocused();
  await expect(page.getByRole('tabpanel')).toHaveCount(1);
});

test('clicking a tab selects it and fires change', async ({ page }) => {
  await page.getByRole('tab', { name: 'Members' }).click();
  await expect(page.locator('#tabs-result')).toHaveText('1');
  await expect(page.getByRole('tabpanel', { name: 'Members' })).toBeVisible();
});

test('clicking a disabled tab does nothing', async ({ page }) => {
  await clickInert(page.getByRole('tab', { name: 'Billing' }));
  expect(await selectedName(page)).toBe('General');
  await expect(page.locator('#tabs-result')).toHaveText('0');
});

// Re-homed from review-fixes.spec.js (Q48).

test('tabs with an out-of-range selection fall back to the first enabled tab', async ({ page }) => {
  await openFromReviewFixes(page);
  await mount(
    page,
    `<focsd-tabs id="tt" label="T" selected="9"><focsd-tab>One</focsd-tab><focsd-tab>Two</focsd-tab><focsd-tab-panel>P1</focsd-tab-panel><focsd-tab-panel>P2</focsd-tab-panel></focsd-tabs>`,
  );
  await expect(page.locator('#tt focsd-tab').first()).toHaveAttribute('tabindex', '0');
  await expect(page.locator('#tt focsd-tab-panel').first()).toBeVisible();
});
