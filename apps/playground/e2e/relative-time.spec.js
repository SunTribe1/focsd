// cspell:ignore Minuten
import { expect, test } from './fixtures/test.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';

test.use({ timezoneId: 'UTC' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-15T10:44:00Z') });
  await page.goto('/relative-time.html');
  await page.waitForFunction(() => customElements.get('focsd-relative-time'));
});

const time = (page, id) => page.locator(`#${id} time`);

test('a time element with relative text, the full date as title and as hidden text', async ({ page }) => {
  await expect(time(page, 'r1')).toHaveAttribute('datetime', '2026-10-15T10:41:00Z');
  await expect(time(page, 'r1')).toHaveText(/^3 minutes ago, October 15, 2026/);
  await expect(time(page, 'r1')).toHaveAttribute('title', /October 15, 2026/);
  await expect(time(page, 'r3')).toHaveText(/^in 3 minutes/);
  await expect(time(page, 'r4')).toHaveText(/^vor 3 Minuten/);
});

test('auto shows the date for older times', async ({ page }) => {
  await expect(time(page, 'r2')).toHaveText(/^Oct 5, 2026/);
});

test('auto stays in days under a full week ("7 days ago" at 6.6 days, never "last week")', async ({ page }) => {
  await expect(time(page, 'r7')).toHaveText(/^7 days ago/);
});

/** Counts the clock's re-renders of one element (each tick calls requestUpdate). */
const countUpdates = (locator) =>
  locator.evaluate((el) => {
    el.updates = 0;
    const request = el.requestUpdate.bind(el);

    el.requestUpdate = (...args) => {
      el.updates += 1;

      return request(...args);
    };
  });

test('an empty or invalid datetime does not join the clock', async ({ page }) => {
  await page.evaluate(() => {
    const empty = document.createElement('focsd-relative-time');

    empty.id = 'empty';
    document.querySelector('main').append(empty);
  });
  await countUpdates(page.locator('#r6'));
  await countUpdates(page.locator('#empty'));
  await page.clock.runFor(3 * 60_000);
  await expect(time(page, 'r1')).toHaveText(/^6 minutes ago/);
  expect(await page.locator('#r6').evaluate((el) => el.updates)).toBe(0);
  expect(await page.locator('#empty').evaluate((el) => el.updates)).toBe(0);
});

test('under 2 hours it ticks each minute, so "in 1 hour" turns into minutes on time', async ({ page }) => {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('focsd-relative-time')) el.remove();
    const soon = document.createElement('focsd-relative-time');

    soon.id = 'soon';
    soon.locale = 'en-US';
    soon.datetime = '2026-10-15T11:45:00Z';
    document.querySelector('main').append(soon);
  });
  await expect(time(page, 'soon')).toHaveText(/^in 1 hour/);
  await page.clock.runFor(2 * 60_000);
  await expect(time(page, 'soon')).toHaveText(/^in 59 minutes/);
});

test('the separator before the hidden full date comes from the translation table', async ({ page }) => {
  await expect(page.locator('#r1 time span')).toHaveText(/^, October 15, 2026/);
  await page.evaluate(() => {
    const ja = document.createElement('focsd-relative-time');

    ja.id = 'ja';
    ja.locale = 'ja';
    ja.datetime = '2026-10-15T10:41:00Z';
    document.querySelector('main').append(ja);
    window.focsd.registerTranslation({ $code: 'ja', listSeparator: '、' });
  });
  await expect(page.locator('#ja time span')).toHaveText(/^、2026/);
});

test('updates on the shared clock; frozen does not', async ({ page }) => {
  expect(await page.locator('#r1').evaluate((el) => el.frozen)).toBe(false);
  expect(await page.locator('#r5').evaluate((el) => el.frozen)).toBe(true);
  expect(await page.locator('#r5').evaluate((el) => 'sync' in el)).toBe(false);
  await page.clock.runFor(2 * 60_000);
  await expect(time(page, 'r1')).toHaveText(/^5 minutes ago/);
  await expect(time(page, 'r5')).toHaveText(/^3 minutes ago/);
});

test('it never uses a live region', async ({ page }) => {
  await expect(page.locator('#r1 [aria-live], #r1 [role="status"]')).toHaveCount(0);
});

test('an invalid datetime renders nothing; text in another locale carries its lang', async ({ page }) => {
  await expect(page.locator('#r6 time')).toHaveCount(0);
  await expect(time(page, 'r4')).toHaveAttribute('lang', 'de');
  await expect(time(page, 'r1')).toHaveAttribute('lang', 'en-US');
});

for (const theme of THEMES)
  test(`axe-clean in the ${theme} theme`, async ({ page }) => {
    await gotoInTheme(page, '/relative-time.html', theme, 'focsd-relative-time');
    await expectAxeClean(page);
  });
