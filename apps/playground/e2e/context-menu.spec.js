import { expect, test } from './fixtures/test.js';
import { openOverlaysPageFromReviewFixes3 } from './fixtures/pages.js';
import { deepActiveId } from './fixtures/dom.js';

// Re-homed from review-fixes-3.spec.js (Q48).

test('context menu opened by pointer on a non-focusable target returns focus to where it was', async ({ page }) => {
  await openOverlaysPageFromReviewFixes3(page);
  await page.locator('#ctx-target').evaluate((el) => el.removeAttribute('tabindex'));
  await page.getByRole('button', { name: 'Save draft' }).focus();
  await page.locator('#ctx-target').click({ button: 'right' });
  await expect(page.getByRole('menu', { name: 'File actions' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect.poll(() => deepActiveId(page)).toBe('toast-btn');
});

test('context menu stays inside the viewport', async ({ page }) => {
  await openOverlaysPageFromReviewFixes3(page);
  await page.setViewportSize({ width: 800, height: 600 });
  await page.locator('#ctx-target').evaluate((el) => {
    el.style.position = 'fixed';
    el.style.right = '0';
    el.style.bottom = '0';
    el.style.width = '120px';
  });
  const box = await page.locator('#ctx-target').boundingBox();
  await page.mouse.click(box.x + box.width - 2, box.y + box.height - 2, { button: 'right' });
  const menu = page.getByRole('menu', { name: 'File actions' });
  await expect(menu).toBeVisible();
  const m = await menu.boundingBox();
  expect(m.x + m.width).toBeLessThanOrEqual(800);
  expect(m.y + m.height).toBeLessThanOrEqual(600);
});
