import { expect, test } from './fixtures/test.js';
import { announcements, recordAnnouncements } from './fixtures/announcements.js';
import { expectTargetsFollowDensity } from './fixtures/targets.js';

// focsd-notification-center (wave 21d). The page's app owns the data: it marks read and removes on the
// center's events, so these tests exercise the round trip the docs describe.

test.beforeEach(async ({ page }) => {
  await recordAnnouncements(page);
  await page.goto('/notifications.html');
  await page.waitForFunction(() => window.__ready && customElements.get('focsd-notification-center'));
});

const bell = (/** @type {import('@playwright/test').Page} */ page) => page.locator('#center [part~="trigger"]');
const panel = (/** @type {import('@playwright/test').Page} */ page) => page.locator('#center [part~="panel"]');

test('the bell is named with the unread count, and the badge shows it', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Notifications, 3 unread' })).toBeVisible();
  await expect(page.locator('#center [part~="badge"]')).toHaveText('3');
  await expect(page.getByRole('button', { name: 'Alerts, 1 unread' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Messages', exact: true })).toBeVisible();
});

test('opening moves focus to the heading; Escape closes and returns focus to the bell', async ({ page }) => {
  await page.evaluate(() => {
    window.__toggles = [];
    document.querySelector('#center')?.addEventListener('toggle', () => window.__toggles.push(document.querySelector('#center')?.open));
  });
  await bell(page).click();
  await expect(page.getByRole('dialog', { name: 'Notifications' })).toBeVisible();
  await expect(page.locator('#center [part~="heading"]')).toBeFocused();
  await expect(bell(page).locator('button')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#center [part~="list"]')).toHaveAttribute('role', 'list');
  await expect(page.locator('#center [part~="item"]')).toHaveCount(4);

  await page.keyboard.press('Escape');
  await expect(panel(page)).toBeHidden();
  await expect(bell(page)).toBeFocused();
  expect(await page.evaluate(() => window.__toggles)).toEqual([true, false]);
});

test('a second click on the bell closes the panel; a click outside closes it too', async ({ page }) => {
  await bell(page).click();
  await expect(panel(page)).toBeVisible();
  await bell(page).click();
  await expect(panel(page)).toBeHidden();
  await bell(page).click();
  await page.mouse.click(5, 5);
  await expect(panel(page)).toBeHidden();
});

test('"Mark all as read" fires focsd-read with every unread id', async ({ page }) => {
  await page.evaluate(() => {
    window.__read = [];
    document.addEventListener('focsd-read', (e) => window.__read.push(/** @type {CustomEvent} */ (e).detail.ids));
  });
  await bell(page).click();
  await page.getByRole('button', { name: 'Mark all as read' }).click();

  expect(await page.evaluate(() => window.__read)).toEqual([['n1', 'n2', 'n3']]);
  await expect(page.getByRole('button', { name: 'Notifications', exact: true })).toBeVisible();
  // The button left with the last unread item: focus stays in the panel, on its heading.
  await expect(page.locator('#center [part~="heading"]')).toBeFocused();
  await expect(page.locator('#center [part~="item-unread"]')).toHaveCount(0);
});

test('following an unread link fires focsd-read for that notification', async ({ page }) => {
  await bell(page).click();
  await page.getByRole('link', { name: 'Build #482 passed' }).click();
  await expect(page.locator('#log')).toHaveText('focsd-read: n1');
});

test('dismiss is named by the title and returns focus to the next item, or the heading', async ({ page }) => {
  await bell(page).click();
  await page.getByRole('button', { name: 'Dismiss Ana commented on Pricing' }).click();
  await expect(page.locator('#log')).toHaveText('focsd-dismiss: n2');
  await expect(page.locator('#center [part~="item"]')).toHaveCount(3);
  // The next item has no link, so its first stop is its own Dismiss button.
  await expect(page.getByRole('button', { name: 'Dismiss Payment failed' })).toBeFocused();

  await page.getByRole('button', { name: 'Dismiss Weekly report ready' }).click();
  await expect(page.locator('#center [part~="heading"]')).toBeFocused();
});

test('the last dismiss shows the empty state', async ({ page }) => {
  await bell(page).click();

  for (const title of ['Build #482 passed', 'Ana commented on Pricing', 'Payment failed', 'Weekly report ready'])
    await page.getByRole('button', { name: `Dismiss ${title}` }).click();

  await expect(page.locator('#center [part~="empty"]')).toHaveText("You're all caught up");
  await expect(page.locator('#center [part~="heading"]')).toBeFocused();
});

test('three rapid arrivals are announced once, politely, without moving focus', async ({ page }) => {
  // The page clock runs the arrivals (150 ms apart) and the 2 s window without real waiting.
  await page.clock.install();
  await page.reload();
  await page.waitForFunction(() => window.__ready && customElements.get('focsd-notification-center'));
  await bell(page).click();
  await page.locator('#center [part~="heading"]').focus();
  await page.evaluate(() => /** @type {HTMLElement} */ (document.querySelector('#arrive')).click());
  await page.clock.runFor(400);
  await expect(page.locator('#center [part~="item"]')).toHaveCount(7);
  await expect(page.locator('#center [part~="heading"]')).toBeFocused();

  const news = async () => (await announcements(page)).filter((a) => /new notification/.test(a.text));
  expect(await news()).toEqual([]);
  await page.clock.runFor(2000);
  await expect.poll(news).toEqual([{ text: '3 new notifications', politeness: 'polite' }]);
  // A second window passes with nothing new: still one message.
  await page.clock.runFor(3000);
  expect(await news()).toHaveLength(1);
  await expect(page.getByRole('button', { name: 'Notifications, 6 unread' })).toBeVisible();
});

test('markup notifications: the app sets read and removes them on the events', async ({ page }) => {
  const markup = page.locator('#markup');
  await markup.locator('[part~="trigger"]').click();
  await expect(page.getByRole('dialog', { name: 'Alerts' })).toBeVisible();
  await expect(markup.locator('[part~="item"]')).toHaveCount(2);
  await markup.getByRole('button', { name: 'Mark all as read' }).click();
  await expect(page.getByRole('button', { name: 'Alerts', exact: true })).toBeVisible();
  await markup.getByRole('button', { name: 'Dismiss Backup finished' }).click();
  await expect(markup.locator('[part~="item"]')).toHaveCount(1);
});

test('the bell, mark-all and dismiss buttons follow the density (44 px at comfortable)', async ({ page }) => {
  await bell(page).click();
  await expectTargetsFollowDensity(page, [
    bell(page),
    page.locator('#center [part~="mark-all"]'),
    page.locator('#center [part~="dismiss"]').first(),
  ]);
});

test('the unread mark is a shape that forced colors keep', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await bell(page).click();
  const dot = page.locator('#center [part~="dot"]').first();
  const style = await dot.evaluate((el) => ({ width: getComputedStyle(el).borderTopWidth, color: getComputedStyle(el).borderTopColor }));

  expect(Number.parseFloat(style.width)).toBeGreaterThanOrEqual(1);
  expect(style.color).not.toBe('rgba(0, 0, 0, 0)');
  await expect(page.locator('#center [part~="title"]').first().locator('.focsd-visually-hidden').first()).toHaveText('Unread,');
});

for (const [name, width] of [
  ['phone (360 px)', 360],
  ['desktop', 1280],
])
  test(`the panel stays on screen: ${name}`, async ({ page }) => {
    await page.setViewportSize({ width: Number(width), height: 740 });
    await bell(page).click();
    const box = await panel(page).boundingBox();

    expect(box?.x).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(Number(width));
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(740);
  });

test('right to left: the panel stays on screen and the badge sits at the inline end', async ({ page }) => {
  const rtl = page.locator('#rtl');
  await rtl.locator('[part~="trigger"]').click();
  const box = await rtl.locator('[part~="panel"]').boundingBox();
  const vw = await page.evaluate(() => innerWidth);

  expect(box?.x).toBeGreaterThanOrEqual(0);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(vw);
  const b = await rtl.locator('[part~="trigger"]').boundingBox();
  const badge = await rtl.locator('[part~="badge"]').boundingBox();
  expect((badge?.x ?? 0) + (badge?.width ?? 0) / 2).toBeLessThan((b?.x ?? 0) + (b?.width ?? 0) / 2);
});

test('the time is relative and follows setLocale', async ({ page }) => {
  await bell(page).click();
  const time = page.locator('#center [part~="time"]').first();
  await expect(time).toContainText('minutes ago');
  await page.evaluate(() => window.__setLocale('de'));
  await expect(time).toContainText(/^vor /);
  await page.evaluate(() => window.__setLocale(null));
});

test('open at load shows the panel, and the bell agrees', async ({ page }) => {
  await page.evaluate(async () => {
    const el = document.createElement('focsd-notification-center');
    el.id = 'loaded';
    el.setAttribute('open', '');
    el.notifications = [{ id: 'x', title: 'Hello there' }];
    document.querySelector('main')?.append(el);
    await el.updateComplete;
  });
  await expect(page.locator('#loaded [part~="panel"]')).toBeVisible();
  await expect(page.locator('#loaded [part~="trigger"] button')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#loaded [part~="heading"]')).toBeFocused();
});

test('a link with a javascript: href is shown as plain text', async ({ page }) => {
  await page.evaluate(async () => {
    const el = document.querySelector('#center');
    el.notifications = [{ id: 'bad', title: 'Click me', href: 'javascript:window.__pwned = 1' }];
    await el.updateComplete;
  });
  await bell(page).click();
  await expect(page.locator('#center [part~="title"]')).toContainText('Click me');
  await expect(page.locator('#center [part~="title"] a')).toHaveCount(0);
});

test('a critical or positive tone is also a shape and a word, not only a color', async ({ page }) => {
  await bell(page).click();
  const critical = page.locator('#center [part~="item"]', { hasText: 'Payment failed' });

  await expect(critical.locator('[part~="tone"] svg')).toBeVisible();
  await expect(critical.locator('[part~="title"]')).toContainText('Error, Payment failed');
});

test('the first load of notifications into an empty center is not announced as new', async ({ page }) => {
  await page.clock.install();
  await page.evaluate(async () => {
    const el = document.querySelector('#empty');
    el.notifications = [
      { id: 'a', title: 'One' },
      { id: 'b', title: 'Two' },
    ];
    await el.updateComplete;
  });
  await page.clock.runFor(5000);
  expect((await announcements(page)).filter((a) => /new notification/.test(a.text))).toEqual([]);
});
