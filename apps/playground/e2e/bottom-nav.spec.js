import { expect, test } from './fixtures/test.js';
import { expectAxeClean } from './fixtures/axe.js';

// Wave 21a: focsd-bottom-nav and focsd-bottom-nav-item on bottom-nav.html (Chromium per owner rule).

const PHONE = { width: 360, height: 640 };

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ width: number, height: number }} [size]
 */
const open = async (page, size = PHONE) => {
  await page.setViewportSize(size);
  await page.goto('/bottom-nav.html');
  await page.waitForFunction(() => window.__ready);
};

test('is a navigation landmark named "Main" with a list of real links', async ({ page }) => {
  await open(page);
  const nav = page.getByRole('navigation', { name: 'Main' });

  await expect(nav).toBeVisible();
  await expect(page.locator('#nav').getByRole('listitem')).toHaveCount(4);
  await expect(page.locator('#nav').getByRole('link', { name: 'Search' })).toHaveAttribute('href', '/search');
});

test('the current item is aria-current="page", and only it', async ({ page }) => {
  await open(page);
  const links = page.locator('#nav').getByRole('link');

  await expect(links.first()).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('#nav').locator('[aria-current]')).toHaveCount(1);
});

test('a badge adds to the link name; the label stays visible next to the icon', async ({ page }) => {
  await open(page);
  const schedule = page.locator('#nav').getByRole('link', { name: 'Inbox, 3 new' });

  await expect(schedule).toBeVisible();
  await expect(schedule.locator('[part~="label"]')).toHaveText('Inbox');
  await expect(schedule.locator('[part~="label"]')).toBeVisible();
  await expect(schedule.locator('[part~="icon"]')).toHaveAttribute('aria-hidden', 'true');
});

test('clicks go to the app link handler (no page load)', async ({ page }) => {
  await open(page);
  await page.evaluate(() => (window.__marker = true));
  await page.locator('#nav').getByRole('link', { name: 'Search' }).click();
  await expect(page.locator('#routed')).toHaveText('/search');
  await expect(page.locator('#calls')).toHaveText('1');
  expect(await page.evaluate(() => window.__marker)).toBe(true);
  await expect(page.locator('#nav').getByRole('link', { name: 'Search' })).toHaveAttribute('aria-current', 'page');
});

test('targets are at least 48 px', async ({ page }) => {
  await open(page);

  const boxes = await page
    .locator('#nav focsd-bottom-nav-item')
    .evaluateAll((els) => els.map((el) => el.shadowRoot.querySelector('a').getBoundingClientRect()));

  for (const box of boxes) {
    expect(box.width).toBeGreaterThanOrEqual(48);
    expect(box.height).toBeGreaterThanOrEqual(48);
  }
});

test('is fixed to the bottom at 360 px and never covers the page’s last content', async ({ page }) => {
  await open(page);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const bar = await page.locator('#nav').evaluate((el) => el.shadowRoot.querySelector('nav').getBoundingClientRect().toJSON());
  const last = await page.locator('#last').evaluate((el) => el.getBoundingClientRect().toJSON());

  expect(Math.round(bar.bottom)).toBe(PHONE.height);
  expect(last.bottom).toBeLessThanOrEqual(bar.top);
});

test('a focused last link is scrolled clear of the bar (scroll-padding-block-end)', async ({ page }) => {
  await open(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('#last-link').focus();
  const bar = await page.locator('#nav').evaluate((el) => el.shadowRoot.querySelector('nav').getBoundingClientRect().toJSON());
  const link = await page.locator('#last-link').evaluate((el) => el.getBoundingClientRect().toJSON());

  expect(link.bottom).toBeLessThanOrEqual(bar.top);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollPaddingBottom)).not.toBe('auto');
});

test('sticky keeps the bar in the flow at the bottom of the viewport', async ({ page }) => {
  await open(page);
  await page.locator('#nav').evaluate(async (el) => {
    el.setAttribute('position', 'sticky');
    await /** @type {any} */ (el).updateComplete;
  });
  const bar = await page.locator('#nav').evaluate((el) => el.getBoundingClientRect().toJSON());

  expect(Math.round(bar.bottom)).toBeLessThanOrEqual(PHONE.height);
});

test('is hidden at 1024 px, and hide-above="0" keeps it', async ({ page }) => {
  await open(page, { width: 1024, height: 768 });
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();
  await page.locator('#nav').evaluate(async (el) => {
    el.setAttribute('hide-above', '0');
    await /** @type {any} */ (el).updateComplete;
  });
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  await page.locator('#nav').evaluate(async (el) => {
    el.setAttribute('hide-above', '1200');
    await /** @type {any} */ (el).updateComplete;
  });
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 768 });
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();
});

test('hideAbove set as a property is honoured: 0 never hides, another width hides from there', async ({ page }) => {
  await open(page, { width: 1024, height: 768 });
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();
  await page.locator('#nav').evaluate(async (el) => {
    /** @type {any} */ (el).hideAbove = 0;
    await /** @type {any} */ (el).updateComplete;
  });
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  await expect(page.locator('#nav')).toHaveAttribute('hide-above', '0');
  await page.locator('#nav').evaluate(async (el) => {
    /** @type {any} */ (el).hideAbove = 1200;
    await /** @type {any} */ (el).updateComplete;
  });
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 768 });
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();
});

test('forced colors mark the current item with an outline', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await open(page);

  const style = await page
    .locator('#nav focsd-bottom-nav-item')
    .first()
    .evaluate((el) => getComputedStyle(el.shadowRoot.querySelector('a')).outlineStyle);

  expect(style).toBe('solid');
});

test('has no axe violations', async ({ page }) => {
  await open(page);
  await expectAxeClean(page);
});
