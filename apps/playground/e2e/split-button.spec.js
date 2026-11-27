import { expect, test } from './fixtures/test.js';
import { ev } from './fixtures/dom.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test.beforeEach(async ({ page }) => {
  await page.goto('/split-button.html');
  await page.waitForFunction(() => customElements.get('focsd-split-button'));
});

const group = (page) => page.locator('#sb').getByRole('group', { name: 'Save' });
const more = (page) => group(page).getByRole('button', { name: 'More actions for Save' });
const item = (page, name) => page.locator('#sb').getByRole('menuitem', { name });

test('a group with the main button and a menu button', async ({ page }) => {
  await expect(group(page).getByRole('button', { name: 'Save', exact: true })).toBeVisible();
  await expect(more(page)).toHaveAttribute('aria-haspopup', 'menu');
  await expect(more(page)).toHaveAttribute('aria-expanded', 'false');
});

test('the main part fires click; the menu button does not', async ({ page }) => {
  await group(page).getByRole('button', { name: 'Save', exact: true }).click();
  await more(page).click();
  await page.keyboard.press('Escape');
  expect(await ev(page)).toEqual([{ type: 'click' }]);
});

for (const key of ['Enter', 'Space', 'ArrowDown'])
  test(`${key} opens the menu on the first item; Escape returns focus`, async ({ page }) => {
    await more(page).focus();
    await page.keyboard.press(key);
    await expect(item(page, 'Save as draft')).toBeFocused();
    await expect(more(page)).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(more(page)).toBeFocused();
  });

test('choosing an item fires focsd-select and closes; disabled items are skipped', async ({ page }) => {
  await more(page).click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(item(page, 'Save as draft')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  expect(await ev(page)).toEqual([{ type: 'focsd-select', value: 'template' }]);
  await expect(page.locator('#sb').getByRole('menu')).toBeHidden();
  await expect(more(page)).toBeFocused();
});

test('a pointer click on an item fires focsd-select and no host click', async ({ page }) => {
  await more(page).click();
  await item(page, 'Save as template').click();
  expect(await ev(page)).toEqual([{ type: 'focsd-select', value: 'template' }]);
  await expect(page.locator('#sb').getByRole('menu')).toBeHidden();
});

test('disabled disables both parts', async ({ page }) => {
  const g = page.locator('#sbd').getByRole('group', { name: 'Save' });
  await expect(g.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
  await expect(g.getByRole('button', { name: 'More actions for Save' })).toBeDisabled();
});

for (const theme of THEMES)
  test(`axe-clean, closed and open, in the ${theme} theme`, async ({ page }) => {
    await gotoInTheme(page, '/split-button.html', theme, 'focsd-split-button');
    await expectAxeClean(page);
    await more(page).click();
    await expectAxeClean(page);
  });

// 14b-10 (14b-1 review hand-off): turning the split button off closes its open menu.
test('becoming disabled closes an open menu', async ({ page }) => {
  await more(page).click();
  await expect(page.locator('#sb').getByRole('menu')).toBeVisible();
  await page.locator('#sb').evaluate(async (el) => {
    el.disabled = true;
    await el.updateComplete;
  });
  await expect(page.locator('#sb').getByRole('menu')).toBeHidden();
  await expect(group(page).getByRole('button', { name: 'More actions for Save' })).toHaveAttribute('aria-expanded', 'false');
});

// 14b-10 (14b-1 review hand-off): without a label the menu button is still named.
test('without a label the menu button is named "More actions"', async ({ page }) => {
  await page.evaluate(async () => {
    const el = document.createElement('focsd-split-button');
    el.id = 'sbn';
    el.innerHTML = '<focsd-menu-item value="draft">Save as draft</focsd-menu-item>';
    document.querySelector('main').append(el);
    await el.updateComplete;
  });
  await expect(page.locator('#sbn').getByRole('button', { name: 'More actions', exact: true })).toBeVisible();
});
