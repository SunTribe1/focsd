import { expect, test } from './fixtures/test.js';
import { boxOf } from './fixtures/dom.js';
import { expectAxeClean } from './fixtures/axe.js';
import { announcements, expectAnnounced, recordAnnouncements } from './fixtures/announcements.js';

// Wave 21b: focsd-lightbox on lightbox.html.

/** @param {import('@playwright/test').Page} page */
const open = async (page) => {
  await page.goto('/lightbox.html');
  await page.waitForFunction(() => window.__ready);
};

/** @param {import('@playwright/test').Page} page */
const viewer = (page) => page.getByRole('dialog', { name: 'Landscapes' });

/** The full image's path in a lightbox. */
const shownImage = (page, id = 'gallery') =>
  page.evaluate(
    (i) => new URL(document.getElementById(i)?.shadowRoot?.querySelector('[part~="image"]')?.src ?? 'about:blank').pathname,
    id,
  );

/** WebKit moves focus between buttons with Alt+Tab. @param {string} browserName */
const tabKey = (browserName) => (browserName === 'webkit' ? 'Alt+Tab' : 'Tab');

test.describe('lightbox: opening and focus', () => {
  test('a thumbnail opens a named modal viewer, and focus returns to it on Escape', async ({ page }) => {
    await open(page);
    const thumb = page.getByRole('link', { name: 'Green hills in summer' });

    await thumb.click();
    await expect(viewer(page)).toBeVisible();
    expect(await shownImage(page)).toBe('/media/hill.svg');
    await expect(viewer(page).getByRole('img', { name: 'Green hills in summer' })).toBeVisible();
    await expect(viewer(page)).toContainText('Hills near the coast');
    await expect(viewer(page)).toContainText('Image 2 of 4');
    await expect(page.getByRole('button', { name: 'Next image' })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(viewer(page)).toBeHidden();
    await expect(thumb).toBeFocused();
  });

  test('keyboard: Enter on a thumbnail opens it, Tab stays in the viewer, Close returns focus', async ({ page, browserName }) => {
    await open(page);
    const thumb = page.getByRole('link', { name: 'A lake under a pale sky' });

    await thumb.focus();
    await page.keyboard.press('Enter');
    await expect(viewer(page)).toBeVisible();

    // As in dialog.spec.js: focus may pass through the browser's own UI (the body) between cycles.
    const tab = tabKey(browserName);

    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press(tab);
      const inside = await page.evaluate(() => document.activeElement?.id === 'gallery' || document.activeElement === document.body);
      expect(inside).toBe(true);
    }

    await page.getByRole('button', { name: 'Close image viewer' }).click();
    await expect(viewer(page)).toBeHidden();
    await expect(thumb).toBeFocused();
  });

  test('the page behind the viewer is inert', async ({ page }) => {
    await open(page);
    await page.getByRole('link', { name: 'A lake under a pale sky' }).click();
    await expect(viewer(page)).toBeVisible();

    const focused = await page.evaluate(() => {
      const button = /** @type {HTMLElement} */ (document.querySelector('#after-gallery'));
      button.focus();

      return document.activeElement === button;
    });

    expect(focused).toBe(false);
  });
});

test.describe('lightbox: moving between images', () => {
  test('arrows, Home, End and the buttons move between images, wrapping', async ({ page }) => {
    await open(page);
    await page.getByRole('link', { name: 'A lake under a pale sky' }).click();
    await expect(viewer(page)).toContainText('Image 1 of 4');

    await page.keyboard.press('ArrowRight');
    await expect(viewer(page)).toContainText('Image 2 of 4');
    await page.keyboard.press('End');
    await expect(viewer(page)).toContainText('Image 4 of 4');
    expect(await shownImage(page)).toBe('/media/dunes.svg');
    await page.getByRole('button', { name: 'Next image' }).click();
    await expect(viewer(page)).toContainText('Image 1 of 4');
    await page.getByRole('button', { name: 'Previous image' }).click();
    await expect(viewer(page)).toContainText('Image 4 of 4');
    await page.keyboard.press('Home');
    await expect(viewer(page)).toContainText('Image 1 of 4');
    await page.keyboard.press('ArrowLeft');
    await expect(viewer(page)).toContainText('Image 4 of 4');
  });

  test('Left and Right are mirrored under RTL', async ({ page }) => {
    await open(page);
    await page.locator('#rtl').getByRole('link', { name: 'Lake' }).click();
    const rtl = page.getByRole('dialog', { name: 'Image viewer' });
    await expect(rtl).toContainText('Image 1 of 3');

    await page.keyboard.press('ArrowLeft');
    await expect(rtl).toContainText('Image 2 of 3');
    await page.keyboard.press('ArrowRight');
    await expect(rtl).toContainText('Image 1 of 3');
  });

  test('a swipe moves to the next image', async ({ page }) => {
    await open(page);
    await page.getByRole('link', { name: 'A lake under a pale sky' }).click();
    const box = await boxOf(viewer(page).getByRole('img'));
    const y = box.y + box.height / 2;

    await page.mouse.move(box.x + box.width * 0.8, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.2, y, { steps: 4 });
    await page.mouse.up();
    await expect(viewer(page)).toContainText('Image 2 of 4');
  });
});

test.describe('lightbox: announcements, events and targets', () => {
  test('each change is announced politely, with its caption', async ({ page }) => {
    await recordAnnouncements(page);
    await open(page);
    await page.getByRole('link', { name: 'A lake under a pale sky' }).click();

    await page.keyboard.press('ArrowRight');
    await expectAnnounced(page, 'Image 2 of 4, Hills near the coast');
    await page.keyboard.press('ArrowRight');
    await expectAnnounced(page, 'Image 3 of 4, A road into the hills');
    expect((await announcements(page)).filter((a) => a.politeness === 'assertive')).toEqual([]);
  });

  test('focsd-index-change and close reach the page', async ({ page }) => {
    await open(page);
    await page.evaluate(() => {
      window.__events = [];
      const el = document.querySelector('#gallery');
      el?.addEventListener('focsd-index-change', (e) => window.__events.push(`index ${/** @type {CustomEvent} */ (e).detail.index}`));
      el?.addEventListener('close', () => window.__events.push('close'));
    });
    await page.getByRole('link', { name: 'A lake under a pale sky' }).click();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Escape');

    await expect.poll(() => page.evaluate(() => window.__events)).toEqual(['index 1', 'close']);
  });

  test('buttons are at least 44 px', async ({ page }) => {
    await open(page);
    await page.getByRole('link', { name: 'A lake under a pale sky' }).click();

    const sizes = await Promise.all(
      ['Previous image', 'Next image', 'Close image viewer'].map((name) => boxOf(page.getByRole('button', { name }))),
    );

    expect(Math.min(...sizes.flatMap(({ width, height }) => [width, height]))).toBeGreaterThanOrEqual(44);
  });

  test('the open viewer passes axe', async ({ page }) => {
    await open(page);
    await page.getByRole('link', { name: 'A lake under a pale sky' }).click();
    await expect(viewer(page)).toBeVisible();
    await expectAxeClean(page);
  });
});

test.describe('lightbox without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the thumbnails are plain links to the full images', async ({ page }) => {
    await page.goto('/lightbox.html');
    const link = page.getByRole('link', { name: 'Green hills in summer' });

    await expect(link).toHaveAttribute('href', '/media/hill.svg');
    await link.click();
    await expect(page).toHaveURL(/\/media\/hill\.svg$/);
  });
});

test.describe('lightbox: motion', () => {
  test('the viewer fades in over a real duration by default', async ({ page }) => {
    await open(page);
    await page.getByRole('link', { name: 'Green hills in summer' }).click();
    await expect(viewer(page)).toBeVisible();
    const duration = await viewer(page).evaluate((el) => getComputedStyle(el).transitionDuration);

    expect(duration).not.toBe('0s');
  });

  test.describe('reduced motion', () => {
    test.use({ contextOptions: { reducedMotion: 'reduce' } });

    test('the viewer and its backdrop do not animate', async ({ page }) => {
      await open(page);
      await page.getByRole('link', { name: 'Green hills in summer' }).click();
      await expect(viewer(page)).toBeVisible();

      const durations = await viewer(page).evaluate((el) => [
        ...getComputedStyle(el).transitionDuration.split(','),
        ...getComputedStyle(el, '::backdrop').transitionDuration.split(','),
      ]);

      // The reduced-motion floor is 0.01 ms (1e-05s), never a visible duration.
      expect(durations.every((d) => Number.parseFloat(d) <= 0.0001)).toBe(true);
    });
  });
});

test.describe('lightbox: links that leave the page', () => {
  test('Alt+Left in the viewer is left to the browser, and does not change the image', async ({ page }) => {
    await open(page);
    await page.getByRole('link', { name: 'Green hills in summer' }).click();
    await expect(viewer(page)).toContainText('Image 2 of 4');
    await page.keyboard.press('Alt+ArrowLeft');
    await expect(viewer(page)).toContainText('Image 2 of 4');
    await page.keyboard.press('ArrowLeft');
    await expect(viewer(page)).toContainText('Image 1 of 4');
  });
});
