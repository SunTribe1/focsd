import { expect, test } from './fixtures/test.js';
import { openOverlaysPageFromReviewFixes3 } from './fixtures/pages.js';
import { deepActiveId } from './fixtures/dom.js';

// Re-homed from review-fixes-3.spec.js (Q48).

test('a toast does not expire while focus is inside it; dismissing keeps focus on the page', async ({ page }) => {
  await openOverlaysPageFromReviewFixes3(page);
  await page.clock.install();
  await page.evaluate(() => document.getElementById('toaster').show({ message: 'Focus me', duration: 700 }));
  const dismiss = page.getByRole('button', { name: 'Dismiss notification' });
  await dismiss.hover();
  await dismiss.focus();
  await page.mouse.move(0, 0);
  await page.clock.runFor(1500);
  await expect(page.locator('#toaster').getByText('Focus me')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('#toaster').getByText('Focus me')).toBeHidden();
  expect(await deepActiveId(page)).not.toBe('body');
});

test('dismissing an earlier toast keeps later toast nodes stable', async ({ page }) => {
  await openOverlaysPageFromReviewFixes3(page);
  await page.evaluate(() => {
    const t = document.getElementById('toaster');
    window.firstId = t.show({ message: 'First', duration: 0 });
    t.show({ message: 'Second', duration: 0 });
  });

  const second = await page
    .locator('#toaster')
    .evaluateHandle((el) => [...el.shadowRoot.querySelectorAll('[part~="toast"]')].find((li) => li.textContent.includes('Second')));

  await page.evaluate(() => document.getElementById('toaster').dismiss(window.firstId));
  expect(await second.evaluate((li) => li.isConnected && li.textContent.includes('Second'))).toBe(true);
});
