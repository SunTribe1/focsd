import { expect, ready, test } from './fixtures/test.js';
import { pressTab } from './fixtures/keys.js';
import { record, recorded } from './fixtures/dom.js';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

// A fake clock runs the open, close and long-press delays without real waits (Q42).
test.beforeEach(async ({ page }) => {
  await page.clock.install();
  await page.goto('/hover-card.html');
  await ready(page, 'focsd-hover-card');
});

const card = (page) => page.locator('#hc [part~="card"]');
const trigger = (page) => page.getByRole('link', { name: 'Ada Lovelace' });

test('opens after the hover delay, stays while hovering the card, closes after leaving', async ({ page }) => {
  await trigger(page).hover();
  await page.clock.runFor(300);
  await expect(card(page)).toBeHidden();
  await page.clock.runFor(300);
  await expect(card(page)).toBeVisible();
  await card(page).hover();
  await page.clock.runFor(500);
  await expect(card(page)).toBeVisible();
  await page.mouse.move(0, 0);
  await page.clock.runFor(300);
  await expect(card(page)).toBeHidden();
  expect(await page.evaluate(() => window.__events.map((e) => e.type))).toEqual(['focsd-open', 'close']);
});

test('opens on keyboard focus; Tab moves into it; Tab out closes; Escape dismisses without moving focus', async ({ page }) => {
  const card2 = page.locator('#hb [part~="card"]');
  const button = page.getByRole('button', { name: 'Team' });
  await button.focus();
  await expect(card2).toBeVisible();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await pressTab(page);
  await expect(page.getByRole('button', { name: 'Join' })).toBeFocused();
  await pressTab(page);
  await expect(card2).toBeHidden();
  await button.focus();
  await expect(card2).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(card2).toBeHidden();
  await expect(button).toBeFocused();
  await expect(button).toHaveAttribute('aria-expanded', 'false');
});

test('the trigger is described by the card text', async ({ page }) => {
  await expect(trigger(page)).toHaveAccessibleDescription(/Mathematician/);
  // focsd-button forwards it as aria-description (as for focsd-tooltip).
  await expect(page.getByRole('button', { name: 'Team' })).toHaveAttribute('aria-description', /Platform team, 6 people/);
});

test.describe('touch', () => {
  test.use({ hasTouch: true, isMobile: true });

  const longPress = async (page) => {
    await trigger(page).dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true, button: 0 });
    await page.clock.runFor(650);
    await trigger(page).dispatchEvent('pointerup', { pointerType: 'touch', isPrimary: true, button: 0 });
  };

  test('a tap outside closes a card opened by long press (review I6)', async ({ page }) => {
    await longPress(page);
    await expect(card(page)).toBeVisible();
    await page.locator('h1').tap();
    await expect(card(page)).toBeHidden();
  });

  test('a long press without a click does not swallow the next tap (review I6)', async ({ page }) => {
    await longPress(page);
    await page.locator('h1').tap();
    await trigger(page).tap();
    await expect(page).toHaveURL(/#ada$/);
  });

  test('a tap follows the link; a long press opens the card', async ({ page }) => {
    await trigger(page).tap();
    await expect(page).toHaveURL(/#ada$/);
    await page.locator('#after').focus();
    await expect(card(page)).toBeHidden();
    await trigger(page).dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true, button: 0 });
    await page.clock.runFor(650);
    await trigger(page).dispatchEvent('pointerup', { pointerType: 'touch', isPrimary: true, button: 0 });
    await expect(card(page)).toBeVisible();
  });
});

test('Escape closes the card but not the dialog around it (review I7)', async ({ page }) => {
  await page.locator('#dlg-open').click();
  const inner = page.getByRole('button', { name: 'Grace' });
  await inner.focus();
  await expect(page.locator('#hd [part~="card"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#hd [part~="card"]')).toBeHidden();
  await expect(page.getByRole('dialog', { name: 'Reviewers' })).toBeVisible();
  await expect(inner).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Reviewers' })).toBeHidden();
});

test("a bubbling close event from the dialog's content does not close the dialog", async ({ page }) => {
  await page.locator('#dlg-open').click();
  await page.locator('#hd').evaluate((el) => el.dispatchEvent(new Event('close', { bubbles: true })));
  await expect(page.getByRole('dialog', { name: 'Reviewers' })).toBeVisible();
});

test('aria-expanded is set only when the card holds interactive content', async ({ page }) => {
  // Ada's card has a Follow button: the trigger says whether it is open.
  await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');
  const docs = page.getByRole('link', { name: 'docs' });
  await docs.focus();
  await expect(page.locator('#ht [part~="card"]')).toBeVisible();
  await expect(docs).not.toHaveAttribute('aria-expanded');
  await page.locator('#dlg-open').click();
  const grace = page.getByRole('button', { name: 'Grace' });
  await grace.focus();
  await expect(page.locator('#hd [part~="card"]')).toBeVisible();
  await expect(grace).not.toHaveAttribute('aria-expanded');
});

test('setting open opens and closes the card, and reflects', async ({ page }) => {
  const hc = page.locator('#hc');
  await hc.evaluate((el) => (el.open = true));
  await expect(card(page)).toBeVisible();
  await expect(hc).toHaveAttribute('open', '');
  await expect(trigger(page)).toHaveAttribute('aria-expanded', 'true');
  await hc.evaluate((el) => (el.open = false));
  await expect(card(page)).toBeHidden();
  await expect(hc).not.toHaveAttribute('open');
  await hc.evaluate((el) => el.setAttribute('open', ''));
  await expect(card(page)).toBeVisible();
  expect(await page.evaluate(() => window.__events.map((e) => e.type))).toEqual(['focsd-open', 'close', 'focsd-open']);
});

// Re-homed from final-minors.spec.js (Q48).

// Ruling: state events (open, close, toggle) fire whenever the element opens or closes, however it
// happened, like <details> toggle and <dialog> close. Value events (change, input,
// focsd-snap-change, select) fire only for the person's actions, like native form controls.
test('a hover card fires focsd-open and close when `open` is set', async ({ page }) => {
  await page.goto('/hover-card.html');
  await ready(page, 'focsd-hover-card');
  await record(page, '#hc', ['focsd-open', 'close']);
  await page.locator('#hc').evaluate((el) => (el.open = true));
  await expect.poll(() => recorded(page)).toEqual(['focsd-open']);
  await page.locator('#hc').evaluate((el) => (el.open = false));
  await expect.poll(() => recorded(page)).toEqual(['focsd-open', 'close']);
});

test('a hover card trigger gets aria-expanded once a focusable is added deep inside the card content', async ({ page }) => {
  await page.goto('/hover-card.html');
  await ready(page, 'focsd-hover-card');
  const docs = page.getByRole('link', { name: 'docs' });
  await expect(docs).not.toHaveAttribute('aria-expanded');
  // Not a new child of the card (no slotchange): a link inside its existing paragraph.
  await page.locator('#ht p').evaluate((p) => {
    const link = document.createElement('a');
    link.href = '#guides';
    link.textContent = 'Read the guides';
    p.append(' ', link);
  });
  await expect(docs).toHaveAttribute('aria-expanded', 'false');
  await page.locator('#ht a[href="#guides"]').evaluate((a) => a.remove());
  await expect(docs).not.toHaveAttribute('aria-expanded');
});
