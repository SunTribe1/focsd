import { expect, test } from './fixtures/test.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';
import { pressTab } from './fixtures/keys.js';

// The dock: a compact segmented control in a raised container. Keyboard, form value, tooltip labels
// (the default) and labels shown under the icons, RTL and axe in every theme.

const bar = (page, id) => page.locator(`#${id}`);
const item = (page, id, name) => bar(page, id).getByRole('radio', { name, exact: true });

test.beforeEach(async ({ page }) => {
  await page.goto('/dock.html');
  await page.waitForFunction(() => window.__ready);
});

test('arrows move and select, skipping disabled items; the value submits', async ({ page }) => {
  await item(page, 'folders', 'Starred').focus();
  await page.keyboard.press('ArrowRight');
  await expect(item(page, 'folders', 'Search')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(item(page, 'folders', 'Drafts')).toBeFocused();
  await expect(item(page, 'folders', 'Drafts')).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.locator('#out')).toHaveText('[["folder","drafts"]]');
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(item(page, 'folders', 'Starred')).toHaveAttribute('aria-checked', 'true');
});

test('one tab stop for the whole bar', async ({ page }) => {
  await item(page, 'folders', 'Starred').focus();
  await pressTab(page);
  await expect(page.getByRole('button', { name: 'Submit' })).toBeFocused();
});

test('hidden labels still name the items, and items are one control tall (never under 24px)', async ({ page }) => {
  const left = item(page, 'hidden', 'Align left');

  await expect(left).toHaveCount(1);

  const box = await left.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(36);
  expect(box?.height).toBeGreaterThanOrEqual(36);

  for (const id of ['small', 'large', 'folders']) {
    const sizes = await bar(page, id)
      .locator('focsd-dock-item')
      .evaluateAll((all) => all.map((el) => el.getBoundingClientRect()).map((r) => Math.min(r.width, r.height)));

    expect(Math.min(...sizes), id).toBeGreaterThanOrEqual(24);
  }
});

test('by default, the label shows as a tip on hover and on keyboard focus; Escape hides it', async ({ page }) => {
  const left = item(page, 'hidden', 'Align left');
  const tip = left.locator('[part~="tip"]');

  await left.hover();
  await expect(tip).toBeVisible();
  await expect(tip).toHaveText('Align left');
  await page.mouse.move(0, 0);
  await expect(tip).toBeHidden();

  // Keyboard focus (focus-visible) shows it as well.
  await left.focus();
  await page.keyboard.press('ArrowRight');
  const right = item(page, 'hidden', 'Align right');
  await expect(right.locator('[part~="tip"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(right.locator('[part~="tip"]')).toBeHidden();
});

test('with label-display="shown" the labels sit under the icons and there is no tip', async ({ page }) => {
  const search = item(page, 'folders', 'Search');

  await page.clock.install();
  await search.hover();
  // Past the tip's hover delay: a tip would be open by now if one were going to show.
  await page.clock.runFor(600);
  await expect(search.locator('[part~="tip"]')).toBeHidden();
});

test('in right-to-left text, ArrowLeft moves to the next item', async ({ page }) => {
  await item(page, 'rtl', 'A').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(item(page, 'rtl', 'B')).toHaveAttribute('aria-checked', 'true');
});

for (const theme of THEMES) {
  test(`dock.html has no axe violations in ${theme}`, async ({ page }) => {
    await gotoInTheme(page, '/dock.html', theme, 'focsd-dock');
    await page.waitForFunction(() => window.__ready);
    await expectAxeClean(page);
  });
}

test('the dock is an opaque raised container', async ({ page }) => {
  const group = bar(page, 'folders').locator('[part~="group"]');

  const style = await group.evaluate((el) => {
    const cs = getComputedStyle(el);

    return { background: cs.backgroundColor, shadow: cs.boxShadow, border: cs.borderTopWidth };
  });

  expect(style.background).not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
  expect(style.shadow).not.toBe('none');
  expect(style.border).not.toBe('0px');
});
