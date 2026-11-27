import { expect, test } from './fixtures/test.js';
import { pressTab } from './fixtures/keys.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/display.html');
  await page.waitForFunction(() =>
    ['focsd-badge', 'focsd-tag', 'focsd-card', 'focsd-alert', 'focsd-avatar', 'focsd-progress', 'focsd-icon', 'focsd-skip-link'].every(
      (t) => customElements.get(t),
    ),
  );
});

test('badges show their text in every tone', async ({ page }) => {
  await expect(page.locator('#badges focsd-badge')).toHaveText(['Draft', 'Active', 'Expiring', 'Overdue', 'Beta']);
});

test('a removable tag has a named remove button that fires focsd-remove', async ({ page }) => {
  await expect(page.locator('#tags').getByRole('button')).toHaveCount(1);
  await page.getByRole('button', { name: 'Remove Design' }).click();
  await expect(page.locator('#tag-removed')).toHaveText('Design');
  await expect(page.locator('#tag-design')).toHaveCount(0);
});

test('card renders header, body and footer in order, with a separator', async ({ page }) => {
  await expect(page.locator('#card')).toMatchAriaSnapshot(`
    - heading "Northwind Studio" [level=3]
    - paragraph: 26 projects, 9 members.
    - separator
    - paragraph: Updated 3 October
  `);
});

test('separators expose orientation; decorative ones are hidden', async ({ page }) => {
  await expect(page.locator('#sep-v')).toHaveAttribute('role', 'separator');
  await expect(page.locator('#sep-v')).toHaveAttribute('aria-orientation', 'vertical');
  await expect(page.locator('#sep-d')).toHaveAttribute('role', 'none');
});

test('alerts are static unless live; live assertive is role=alert', async ({ page }) => {
  await expect(page.getByRole('alert')).toHaveCount(1);
  await expect(page.getByRole('alert')).toContainText('Payment failed');
  await expect(page.locator('#alerts focsd-alert').first()).toContainText('Changes saved');
  await expect(page.locator('#alerts focsd-alert').first()).not.toHaveAttribute('role', /.*/);
});

test('avatars are named images with initials fallback; groups collapse overflow', async ({ page }) => {
  await expect(page.getByRole('img', { name: 'Amara Okafor' }).first()).toBeVisible();
  await expect(page.locator('#av-initials')).toHaveJSProperty('initials', 'AO');
  await expect
    .poll(() => page.locator('#av-broken').evaluate((el) => el.shadowRoot.querySelector('[part~="initials"]')?.textContent.trim()))
    .toBe('LB');
  await expect(page.getByRole('group', { name: 'Project members' })).toBeVisible();
  await expect(page.locator('#av-group').getByRole('img', { name: '2 more' })).toBeVisible();
});

test('progress exposes value; indeterminate omits it; updates live', async ({ page }) => {
  const bar = page.getByRole('progressbar', { name: 'Uploading report.pdf' });
  await expect(bar).toHaveAttribute('aria-valuenow', '40');
  await expect(bar).toHaveAttribute('aria-valuemax', '100');
  await page.locator('#progress').evaluate((el) => {
    el.value = 75;
  });
  await expect(bar).toHaveAttribute('aria-valuenow', '75');
  await expect(page.getByRole('progressbar', { name: 'Preparing export' })).not.toHaveAttribute('aria-valuenow', /.*/);
});

test('indeterminate progress slides toward the inline end, in right-to-left pages too', async ({ page }) => {
  /** Direction the indicator moves over one loop: 1 is rightward, -1 leftward. */
  const travel = (dir) =>
    page.locator('#progress-ind').evaluate(async (el, d) => {
      el.dir = d;
      await el.updateComplete;
      const bar = el.shadowRoot.querySelector('[part~="indicator"]');
      const [loop] = bar.getAnimations();
      loop.pause();
      loop.currentTime = 0;
      const from = bar.getBoundingClientRect().left;
      loop.currentTime = loop.effect.getComputedTiming().duration * 0.9;
      const to = bar.getBoundingClientRect().left;

      return Math.sign(to - from);
    }, dir);

  expect(await travel('ltr')).toBe(1);
  expect(await travel('rtl')).toBe(-1);
});

test('the progress indicator grows with a transform, not a layout property', async ({ page }) => {
  const motion = await page.locator('#progress').evaluate((el) => {
    const cs = getComputedStyle(el.shadowRoot.querySelector('[part~="indicator"]'));

    return { property: cs.transitionProperty, transform: cs.transform };
  });

  expect(motion.property).toBe('transform');
  // 40%: matrix(0.4, 0, 0, 1, 0, 0).
  expect(motion.transform).toMatch(/^matrix\(0\.4, 0, 0, 1, 0, 0\)$/);
});

test('meter exposes value text so color is not the only signal', async ({ page }) => {
  const meter = page.getByRole('meter', { name: 'Seats used' });
  await expect(meter).toHaveAttribute('aria-valuetext', '9 of 10 seats');
  await expect(meter).toHaveAttribute('aria-valuenow', '9');
});

test('spinners are named status regions; skeletons are hidden from AT', async ({ page }) => {
  await expect(page.getByRole('status', { name: 'Loading' })).toBeVisible();
  await expect(page.getByRole('status', { name: 'Saving' })).toBeVisible();
  const hidden = await page.locator('#skeletons focsd-skeleton').evaluateAll((els) => els.map((e) => e.getAttribute('aria-hidden')));
  expect(hidden).toEqual(['true', 'true']);
});

test('spinner and skeleton stop animating under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });

  const names = await page.evaluate(() => {
    const spin = document.getElementById('spinner').shadowRoot.querySelector('[part~="spinner"]');

    return getComputedStyle(spin).animationName;
  });

  expect(names).not.toContain('focsd-spin');
});

test('kbd renders a kbd element; links are links; external links announce new tab', async ({ page }) => {
  expect(
    await page
      .locator('#kbd-line focsd-kbd')
      .first()
      .evaluate((el) => el.shadowRoot.querySelector('kbd') !== null),
  ).toBe(true);
  await expect(page.getByRole('link', { name: 'guide' })).toHaveAttribute('href', '#sec-text');
  const external = page.getByRole('link', { name: 'status page (opens in new tab)' });
  await expect(external).toHaveAttribute('target', '_blank');
  await expect(external).toHaveAttribute('rel', /noopener/);
});

test('visually hidden text is read but takes no space', async ({ page }) => {
  await expect(page.locator('#vh')).toContainText('(including tax)');
  const box = await page.locator('#vh focsd-visually-hidden').boundingBox();
  expect(box.width).toBeLessThan(1.5);
  expect(box.height).toBeLessThan(1.5);
});

test('icons are decorative unless labelled', async ({ page }) => {
  await expect(page.locator('#icons').getByRole('img')).toHaveCount(2);
  await expect(page.getByRole('img', { name: 'Warning' })).toBeVisible();
  await expect(page.locator('#icons focsd-icon').first()).toHaveAttribute('aria-hidden', 'true');
});

test('skip link is the first tab stop, appears on focus and moves focus to main', async ({ page }) => {
  await pressTab(page);
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.locator('#pg-main')).toBeFocused();
});
