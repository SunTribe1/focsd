import { expect, ready, test } from './fixtures/test.js';
import { frames } from './fixtures/pages.js';
import { record, recorded } from './fixtures/dom.js';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test.beforeEach(async ({ page }) => {
  await page.goto('/sheet.html');
  await page.waitForFunction(() => customElements.get('focsd-bottom-sheet'));
});

const sheet = (page) => page.getByRole('dialog', { name: 'Filters' });
const handle = (page) => sheet(page).getByRole('slider', { name: 'Resize sheet' });

/** Visible height of the sheet as a percentage of the viewport (the panel slides with transform). */
const height = (page, id = 's') =>
  page.locator(`#${id} [part~="panel"]`).evaluate(async (el) => {
    await Promise.all(el.getAnimations().map((a) => a.finished));

    return Math.round(((innerHeight - el.getBoundingClientRect().top) / innerHeight) * 100);
  });

test('modal: opens at the first snap point; Escape closes and returns focus', async ({ page }) => {
  await page.locator('#open-sheet').click();
  await expect(sheet(page)).toBeVisible();
  await expect.poll(() => height(page)).toBeGreaterThanOrEqual(38);
  expect(await height(page)).toBeLessThanOrEqual(42);
  await page.keyboard.press('Escape');
  await expect(sheet(page)).toBeHidden();
  await expect(page.getByRole('button', { name: 'Filters' })).toBeFocused();
});

test('the handle resizes by keyboard and reports the height', async ({ page }) => {
  await page.locator('#open-sheet').click();
  await handle(page).focus();
  await page.keyboard.press('ArrowUp');
  await expect(handle(page)).toHaveAttribute('aria-valuetext', '90% of the screen');
  await expect.poll(() => height(page)).toBeGreaterThanOrEqual(88);
  expect(await page.evaluate(() => window.__events.at(-1))).toEqual({ type: 'focsd-snap-change', index: 1 });
  await page.keyboard.press('Enter');
  await expect(handle(page)).toHaveAttribute('aria-valuetext', '40% of the screen');
});

test('everything in the sheet can be scrolled into view at the lowest snap point', async ({ page }) => {
  await page.locator('#open-sheet').click();
  const apply = page.getByRole('button', { name: 'Apply' });
  await apply.scrollIntoViewIfNeeded();
  const box = await apply.boundingBox();
  expect(box.y + box.height).toBeLessThanOrEqual(await page.evaluate(() => innerHeight));
});

test('a close button and data-dialog-close exist, so dragging is never needed', async ({ page }) => {
  await page.locator('#open-sheet').click();
  await sheet(page).getByRole('button', { name: 'Close' }).click();
  await expect(sheet(page)).toBeHidden();
  await page.locator('#open-sheet').click();
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(sheet(page)).toBeHidden();
  await expect(page.locator('#s')).toHaveJSProperty('returnValue', 'apply');
});

/** A touch swipe of `dy` px on `selector`, as pointer events. */
const swipe = async (page, selector, dy, steps = 6) => {
  const target = page.locator(selector);
  const b = await target.boundingBox();
  const x = b.x + b.width / 2;
  const y = b.y + Math.min(10, b.height / 2);
  const init = { pointerType: 'touch', isPrimary: true, pointerId: 7, button: 0, clientX: x };
  await target.dispatchEvent('pointerdown', { ...init, clientY: y });

  for (let i = 1; i <= steps; i++) await target.dispatchEvent('pointermove', { ...init, clientY: y + (dy * i) / steps });
  await target.dispatchEvent('pointerup', { ...init, clientY: y + dy });
};

test.describe('touch', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test('drag up snaps to the next point; a flick down dismisses', async ({ page }) => {
    await page.locator('#open-sheet').click();
    await swipe(page, '#s [part~="handle"]', -300);
    await expect.poll(() => height(page)).toBeGreaterThanOrEqual(88);
    await swipe(page, '#s [part~="handle"]', 600, 2);
    await expect(sheet(page)).toBeHidden();
  });

  test('persistent: a flick down does not dismiss', async ({ page }) => {
    const terms = page.getByRole('dialog', { name: 'Terms' });
    await page.locator('#open-terms').click();
    await expect(terms).toBeVisible();
    await swipe(page, '#nd [part~="handle"]', 600, 2);
    await expect(terms).toBeVisible();
    await expect(page.locator('#nd')).toHaveJSProperty('open', true);
  });

  test('a pull in a scrolled inner list scrolls it, not the sheet (review I5)', async ({ page }) => {
    await page.locator('#open-sheet').click();
    await page.locator('#inner').evaluate((el) => (el.scrollTop = 100));
    const before = await height(page);
    await swipe(page, '#inner p', 200);
    expect(await height(page)).toBe(before);
    await expect(sheet(page)).toBeVisible();
  });

  test('a cancelled gesture snaps back instead of dismissing (review I5)', async ({ page }) => {
    await page.locator('#open-sheet').click();
    const before = await height(page);
    const h = page.locator('#s [part~="handle"]');
    const b = await h.boundingBox();
    const init = { pointerType: 'touch', isPrimary: true, pointerId: 9, button: 0, clientX: b.x + 5 };
    await h.dispatchEvent('pointerdown', { ...init, clientY: b.y + 5 });
    await h.dispatchEvent('pointermove', { ...init, clientY: b.y + 300 });
    await h.dispatchEvent('pointercancel', { ...init, clientY: 0 });
    await expect(sheet(page)).toBeVisible();
    await expect.poll(() => height(page)).toBe(before);
  });

  test('a drag that starts in scrolled content scrolls instead of moving the sheet', async ({ page }) => {
    await page.locator('#open-sheet').click();
    // The sheet's own body (slotted form controls have a part="body" too since 14.0).
    await page.locator('#s').evaluate((el) => (el.shadowRoot.querySelector('[part~="body"]').scrollTop = 200));
    const before = await height(page);
    await swipe(page, '#long', 150);
    expect(await height(page)).toBe(before);
    await expect(sheet(page)).toBeVisible();
  });
});

test('non-modal: a named region at its first snap point; the page stays usable', async ({ page }) => {
  expect(await page.locator('#s').evaluate((el) => el.nonModal)).toBe(false);
  expect(await page.locator('#nm').evaluate((el) => el.nonModal)).toBe(true);
  expect(await page.locator('#nm').evaluate((el) => 'modal' in el)).toBe(false);
  await expect(page.getByRole('region', { name: 'Now playing' })).toBeVisible();
  await expect.poll(() => height(page, 'nm')).toBeGreaterThanOrEqual(23);
  await page.locator('#open-sheet').click();
  await expect(sheet(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('#nm').getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('region', { name: 'Now playing' })).toBeHidden();
});

test('controls and text inside the sheet keep their own drags (review I5)', async ({ page }) => {
  await page.locator('#open-sheet').click();
  const before = await height(page);
  const slider = page.locator('#price').getByRole('slider');
  const b = await slider.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 60, b.y + b.height / 2 + 40, { steps: 6 });
  await page.mouse.up();
  expect(await page.locator('#price').evaluate((el) => el.value)).toBeGreaterThan(50);
  expect(await height(page)).toBe(before);
  const text = await page.locator('#long p').first().boundingBox();
  await page.mouse.move(text.x + 5, text.y + 5);
  await page.mouse.down();
  await page.mouse.move(text.x + 80, text.y + 60, { steps: 6 });
  await page.mouse.up();
  expect(await height(page)).toBe(before);
});

test('persistent: Escape and a backdrop click do not close a modal sheet; Close and data-dialog-close still do', async ({ page }) => {
  expect(await page.locator('#s').evaluate((el) => el.persistent)).toBe(false);
  expect(await page.locator('#nd').evaluate((el) => el.persistent)).toBe(true);
  expect(await page.locator('#nd').evaluate((el) => 'dismissible' in el)).toBe(false);
  const terms = page.getByRole('dialog', { name: 'Terms' });
  await page.locator('#open-terms').click();
  await expect(terms).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(terms).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(terms).toBeVisible();
  await expect(page.locator('#nd')).toHaveJSProperty('open', true);
  await terms.getByRole('button', { name: 'Close' }).click();
  await expect(terms).toBeHidden();
  await page.locator('#open-terms').click();
  await page.getByRole('button', { name: 'Accept' }).click();
  await expect(terms).toBeHidden();
  await expect(page.locator('#nd')).toHaveJSProperty('returnValue', 'accept');
});

test('setting snap moves the sheet; only user moves fire focsd-snap-change', async ({ page }) => {
  await page.locator('#open-sheet').click();
  await expect.poll(() => height(page)).toBeLessThanOrEqual(42);
  await page.locator('#s').evaluate((el) => (el.snap = 1));
  await expect.poll(() => height(page)).toBeGreaterThanOrEqual(88);
  await expect(handle(page)).toHaveAttribute('aria-valuetext', '90% of the screen');
  await expect(page.locator('#s')).toHaveAttribute('snap', '1');
  expect(await page.evaluate(() => window.__events.filter((e) => e.type === 'focsd-snap-change'))).toEqual([]);
});

test('non-modal: Escape inside a sheet that is not persistent closes it', async ({ page }) => {
  const region = page.getByRole('region', { name: 'Now playing' });
  await region.getByRole('slider', { name: 'Resize sheet' }).focus();
  await page.keyboard.press('Escape');
  await expect(region).toBeHidden();
  expect(await page.evaluate(() => window.__events.at(-1))).toEqual({ type: 'close', id: 'nm' });
});

test('non-modal: Escape outside the sheet leaves it open', async ({ page }) => {
  await page.locator('h1').click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('region', { name: 'Now playing' })).toBeVisible();
});

/** Adds a tooltip-wrapped button and a nav menu to the open non-modal sheet. */
const addNestedOverlays = (page) =>
  page.locator('#nm').evaluate(async (el) => {
    el.insertAdjacentHTML(
      'beforeend',
      `<focsd-tooltip id="nm-tip" text="Skip to the next track" delay="0"><button type="button">Next</button></focsd-tooltip>
      <focsd-nav-menu label="Queue"><focsd-nav-item label="Up next" id="nm-nav"><focsd-nav-item href="#a">Track 4</focsd-nav-item></focsd-nav-item></focsd-nav-menu>`,
    );
    await Promise.all(['focsd-tooltip', 'focsd-nav-menu', 'focsd-nav-item'].map((t) => customElements.whenDefined(t)));
  });

test('non-modal: Escape dismisses a tooltip inside the sheet first, the next Escape closes the sheet (WCAG 1.4.13)', async ({ page }) => {
  const region = page.getByRole('region', { name: 'Now playing' });
  await addNestedOverlays(page);
  const tip = page.locator('#nm-tip [part~="tooltip"]');
  await page.locator('#nm-tip button').focus();
  await expect(tip).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tip).toBeHidden();
  await expect(region).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(region).toBeHidden();
});

test('non-modal: Escape closes an open nav menu inside the sheet first, the next Escape closes the sheet', async ({ page }) => {
  const region = page.getByRole('region', { name: 'Now playing' });
  await addNestedOverlays(page);
  const trigger = page.locator('#nm-nav').getByRole('button', { name: 'Up next' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#nm-nav')).toHaveJSProperty('open', true);
  await page.keyboard.press('Escape');
  await expect(page.locator('#nm-nav')).toHaveJSProperty('open', false);
  await expect(trigger).toBeFocused();
  await expect(region).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(region).toBeHidden();
});

// Re-homed from final-minors.spec.js (Q48).

// Ruling: state events (open, close, toggle) fire whenever the element opens or closes, however it
// happened, like <details> toggle and <dialog> close. Value events (change, input,
// focsd-snap-change, select) fire only for the person's actions, like native form controls.
// Deferred minor findings from the final review of feat/ten: popover closed-state belt, measured
// rows under a transform, events on property set, and hover card trigger state.
test('a bottom sheet fires no focsd-snap-change when `snap` is set (a value, like input.value)', async ({ page }) => {
  await page.goto('/sheet.html');
  await ready(page, 'focsd-bottom-sheet');
  await record(page, '#s', ['focsd-snap-change', 'close']);
  await page.locator('#s').evaluate(async (el) => {
    el.open = true;
    await el.updateComplete;
    el.snap = 1;
    await el.updateComplete;
  });
  await frames(page);
  expect(await recorded(page)).toEqual([]);
  await page.locator('#s').evaluate((el) => (el.open = false));
  await expect.poll(() => recorded(page)).toEqual(['close']);
});
