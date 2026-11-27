import { expect, test } from './fixtures/test.js';

// Re-homed from wave8.spec.js (Q48): every animated component honours reduced motion.
/** Total transition + animation time on an element, in ms. */
const motionMs = (locator) =>
  locator.evaluate((el) => {
    const cs = getComputedStyle(el);
    const ms = (v) => Math.max(...v.split(',').map((t) => Number.parseFloat(t) * (t.trim().endsWith('ms') ? 1 : 1000)));

    return ms(cs.transitionDuration) + ms(cs.animationDuration);
  });

const MOTION = [
  { title: 'motion: components animate', reducedMotion: 'no-preference', expectMs: (ms, label) => expect(ms, label).toBeGreaterThan(0) },
  {
    title: 'motion: components animate not at all under reduced motion',
    reducedMotion: 'reduce',
    expectMs: (ms, label) => expect(ms, label).toBeLessThan(1),
  },
];

for (const { title, reducedMotion, expectMs } of MOTION) {
  test(title, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });

    const check = async (locator, label) => expectMs(await motionMs(locator), label);

    await page.goto('/');
    await page.waitForFunction(() => customElements.get('focsd-dialog'));
    await check(page.locator('#btn-action').locator('button'), 'button');
    await page.getByRole('button', { name: 'Remove member' }).click();
    await check(page.locator('#dlg').locator('dialog'), 'dialog');
    await page.keyboard.press('Escape');
    await page.locator('#sel').locator('[part~="trigger"]').click();
    await check(page.locator('#sel').locator('[part~="popup"]'), 'select popup');
    await page.keyboard.press('Escape');

    await page.goto('/overlays.html');
    await page.waitForFunction(() => customElements.get('focsd-accordion'));
    await page.locator('#pop-trigger').click();
    await check(page.locator('#pop').locator('[part~="panel"]'), 'popover');
    await page.keyboard.press('Escape');
    await page.locator('#menu-trigger').click();
    await check(page.locator('#menu').locator('[role="menu"]'), 'menu');
    await page.keyboard.press('Escape');
    await check(page.locator('#acc focsd-accordion-item').first().locator('[role="region"]'), 'accordion panel');
    await page.locator('#toast-btn').click();
    await check(page.locator('#toaster').locator('[part~="toast"]').first(), 'toast');
  });
}
