import { expect, test } from './fixtures/test.js';
import { pressTab } from './fixtures/keys.js';
import { expectAnnounced, recordAnnouncements } from './fixtures/announcements.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test.beforeEach(async ({ page }) => {
  await recordAnnouncements(page);
  await page.goto('/toggletip.html');
  await page.waitForFunction(() => customElements.get('focsd-toggletip'));
});

const button = (page, name = 'More information') => page.getByRole('button', { name });
const panel = (page, id = 'tt') => page.locator(`#${id} [part~="panel"]`);

test('an info button with aria-expanded; the label is configurable', async ({ page }) => {
  await expect(button(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(button(page, 'About retention')).toBeVisible();
});

test('click opens without moving focus and announces the text politely', async ({ page }) => {
  await button(page).click();
  await expect(panel(page)).toBeVisible();
  await expect(button(page)).toBeFocused();
  await expect(button(page)).toHaveAttribute('aria-expanded', 'true');
  await expectAnnounced(page, 'Includes files in the trash. See billing');
});

test('Enter opens; Escape closes and keeps focus; the button again closes', async ({ page }) => {
  await button(page).focus();
  await page.keyboard.press('Enter');
  await expect(panel(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel(page)).toBeHidden();
  await expect(button(page)).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect(panel(page)).toBeHidden();
});

test('an outside click closes it; links inside are reachable with Tab', async ({ page }) => {
  await button(page).click();
  await pressTab(page);
  await expect(page.getByRole('link', { name: 'See billing' })).toBeFocused();
  await page.locator('#outside').click();
  await expect(panel(page)).toBeHidden();
});

test.describe('touch', () => {
  test.use({ hasTouch: true, isMobile: true });

  test('a tap opens it', async ({ page }) => {
    await button(page).tap();
    await expect(panel(page)).toBeVisible();
  });
});

for (const theme of THEMES)
  test(`axe-clean, closed and open, in the ${theme} theme`, async ({ page }) => {
    await gotoInTheme(page, '/toggletip.html', theme, 'focsd-toggletip');
    await expectAxeClean(page);
    await button(page).click();
    await expectAxeClean(page);
  });

test('Escape from a link inside the note closes it and puts focus back on the button', async ({ page }) => {
  await button(page).click();
  await pressTab(page);
  await expect(page.getByRole('link', { name: 'See billing' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(panel(page)).toBeHidden();
  await expect(button(page)).toBeFocused();
});

test('moved while open, it resets to closed and reopens with the announcement and focsd-open', async ({ page }) => {
  await button(page).click();
  await expect(panel(page)).toBeVisible();
  await expectAnnounced(page, 'Includes files in the trash. See billing');
  await page.evaluate(() => {
    const tip = document.querySelector('#tt');
    document.querySelector('#outside').before(tip);
    window.__opened = 0;
    tip.addEventListener('focsd-open', () => window.__opened++);
    window.__focsdAnnouncements.length = 0;
  });
  await expect(panel(page)).toBeHidden();
  await expect(button(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#tt [part~="status"]')).toHaveText('');
  await button(page).click();
  await expect(panel(page)).toBeVisible();
  await expect(button(page)).toHaveAttribute('aria-expanded', 'true');
  await expectAnnounced(page, 'Includes files in the trash. See billing');
  expect(await page.evaluate(() => window.__opened)).toBe(1);
});
