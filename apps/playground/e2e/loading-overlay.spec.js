import { expect, test, settle as frames } from './fixtures/test.js';
import { announcements, expectAnnounced, recordAnnouncements } from './fixtures/announcements.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test.beforeEach(async ({ page }) => {
  await recordAnnouncements(page);
  await page.goto('/loading.html');
  await page.waitForFunction(() => customElements.get('focsd-loading-overlay'));
});

const setActive = (page, id, on) =>
  page.locator(`#${id}`).evaluate(async (el, v) => {
    el.active = v;
    await el.updateComplete;
  }, on);

/**
 * Names of the exposed (not ignored) nodes with this role in Chromium's real accessibility tree.
 * Playwright's own role engine ignores `inert`, so getByRole cannot prove inertness.
 */
const exposedNames = async (page, role) => {
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');

  await cdp.detach();

  return nodes.filter((n) => !n.ignored && n.role?.value === role).map((n) => n.name?.value);
};

const announced = async (page, text) => (await announcements(page)).some((a) => a.text.includes(text));

test('while active, inert content is out of the accessibility tree, not only skipped by focus', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Only Chromium exposes its accessibility tree (CDP)');
  expect(await exposedNames(page, 'button')).toContain('Save');
  await setActive(page, 'lo', true);
  await expect(page.locator('#lo [part~="region"]')).toHaveAttribute('aria-busy', 'true');
  expect(await exposedNames(page, 'button')).not.toContain('Save');
  expect(await exposedNames(page, 'textbox')).not.toContain('Team name');
});

test('while active: busy, inert, a visible overlay with text, announced', async ({ page }) => {
  await setActive(page, 'lo', true);
  await expect(page.locator('#lo [part~="region"]')).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('#lo [part~="text"]')).toHaveText('Loading');
  await expectAnnounced(page, 'Loading');

  // Every engine: Tab from the button before the region skips the inert content.
  await page.locator('#toggle').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#name')).not.toBeFocused();
  await expect(page.locator('#save')).not.toBeFocused();
  await page.locator('#save').focus();
  await expect(page.locator('#save')).not.toBeFocused();
  await setActive(page, 'lo', false);
  await expectAnnounced(page, 'Loaded');
  await expect(page.locator('#lo [part~="region"]')).not.toHaveAttribute('aria-busy');
});

test('focus inside moves to the overlay and comes back', async ({ page }) => {
  await page.locator('#save').focus();
  await setActive(page, 'lo', true);
  await expect(page.locator('#lo [part~="overlay"]')).toBeFocused();
  await setActive(page, 'lo', false);
  await expect(page.locator('#save')).toBeFocused();
});

test('when focus moves to the overlay, its name says "Loading", so the status does not repeat it', async ({ page }) => {
  await page.locator('#save').focus();
  await setActive(page, 'lo', true);
  await expect(page.getByRole('group', { name: 'Loading' })).toBeFocused();
  await frames(page);
  expect(await announced(page, 'Loading')).toBe(false);
  await setActive(page, 'lo', false);
  await expectAnnounced(page, 'Loaded');
});

test('active on first render: no announcement and no focus move', async ({ page }) => {
  await page.locator('main').evaluate(async (main) => {
    const host = document.createElement('div');

    host.innerHTML =
      '<focsd-loading-overlay id="lo3" active label="Fetching report"><input id="early" aria-label="Early"></focsd-loading-overlay>';
    main.append(host);
    // Focus content before the first render, as an autofocus inside markup would.
    /** @type {HTMLInputElement} */ (host.querySelector('#early')).focus();
    await /** @type {any} */ (host.firstElementChild).updateComplete;
  });
  await frames(page);
  await expect(page.locator('#lo3 [part~="text"]')).toHaveText('Fetching report');
  await expect(page.locator('#lo3 [part~="overlay"]')).not.toBeFocused();
  expect(await announced(page, 'Fetching report')).toBe(false);
  // Ending it later is a real change, so it is announced.
  await setActive(page, 'lo3', false);
  await expectAnnounced(page, 'Loaded');
});

test('if the focused element is gone when loading ends, focus goes to the first focusable in the region', async ({ page }) => {
  await page.locator('#save').focus();
  await setActive(page, 'lo', true);
  await page.locator('#save').evaluate((el) => el.remove());
  await setActive(page, 'lo', false);
  await expect(page.getByRole('textbox', { name: 'Team name' })).toBeFocused();
});

test('focus outside stays where it is; the label is configurable', async ({ page }) => {
  await page.locator('#toggle').focus();
  await setActive(page, 'lo2', true);
  await expect(page.locator('#toggle')).toBeFocused();
  await expect(page.locator('#lo2 [part~="text"]')).toHaveText('Saving changes');
});

for (const theme of THEMES)
  test(`axe-clean, idle and active, in the ${theme} theme`, async ({ page }) => {
    await gotoInTheme(page, '/loading.html', theme, 'focsd-loading-overlay');
    await expectAxeClean(page);
    await setActive(page, 'lo', true);
    await expectAxeClean(page);
  });

test('forced colors: the overlay is an opaque, outlined system surface', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await setActive(page, 'lo', true);

  const overlay = page.locator('#lo [part~="overlay"]');
  await expect(overlay).toHaveCSS('border-top-style', 'solid');

  const alpha = await overlay.evaluate((el) => {
    const probe = document.createElement('canvas').getContext('2d');
    probe.fillStyle = getComputedStyle(el).backgroundColor;
    probe.fillRect(0, 0, 1, 1);

    return probe.getImageData(0, 0, 1, 1).data[3];
  });

  expect(alpha).toBe(255);
});
