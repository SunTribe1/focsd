import { expect, test } from './fixtures/test.js';
import { ev } from './fixtures/dom.js';
import { expectAnnounced, recordAnnouncements } from './fixtures/announcements.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test.beforeEach(async ({ page }) => {
  await recordAnnouncements(page);
  await page.goto('/tour.html');
  await page.waitForFunction(() => customElements.get('focsd-tour'));
  await page.locator('#start').click();
});

const dialog = (page) => page.getByRole('dialog');

test('a non-modal dialog named by the step title, with progress and body; focus on the heading', async ({ page }) => {
  await expect(dialog(page)).toHaveAccessibleName('Search');
  await expect(dialog(page)).toHaveAttribute('aria-modal', 'false');
  await expect(dialog(page)).toHaveAccessibleDescription('Find any project by name or owner.');
  await expect(dialog(page).getByText('Step 1 of 2')).toBeVisible();
  await expect(dialog(page).getByRole('heading', { name: 'Search' })).toBeFocused();
});

test('the panel sits next to its target', async ({ page }) => {
  const t = await page.locator('#search').boundingBox();
  const p = await page.locator('#tour [part~="panel"]').boundingBox();
  expect(p.y).toBeGreaterThanOrEqual(t.y + t.height);
  expect(p.y - (t.y + t.height)).toBeLessThanOrEqual(24);
});

test('a missing target is skipped and the skip is announced; the far target is scrolled into view', async ({ page }) => {
  await dialog(page).getByRole('button', { name: 'Next' }).click();
  await expectAnnounced(page, 'Skipped “Filters”: it is not on this page.');
  await expect(dialog(page)).toHaveAccessibleName('Export');
  await expect(page.locator('#export')).toBeInViewport();
  expect(await ev(page)).toEqual([
    { type: 'focsd-step-change', step: 0 },
    { type: 'focsd-step-change', step: 2 },
  ]);
});

test('Back, then Finish ends with completed=true and returns focus to the opener', async ({ page }) => {
  await dialog(page).getByRole('button', { name: 'Next' }).click();
  await dialog(page).getByRole('button', { name: 'Back' }).click();
  await expect(dialog(page)).toHaveAccessibleName('Search');
  await dialog(page).getByRole('button', { name: 'Next' }).click();
  await dialog(page).getByRole('button', { name: 'Finish' }).click();
  await expect(dialog(page)).toBeHidden();
  await expect(page.locator('#start')).toBeFocused();
  expect((await ev(page)).at(-1)).toEqual({ type: 'close', completed: true });
});

test('Skip tour and Escape end with completed=false; persistent keeps Escape from ending it', async ({ page }) => {
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  expect((await ev(page)).at(-1)).toEqual({ type: 'close', completed: false });
  expect(await page.locator('#tour').evaluate((el) => el.persistent)).toBe(false);
  expect(await page.locator('#tour').evaluate((el) => 'dismissible' in el)).toBe(false);
  await page.locator('#tour').evaluate((el) => el.setAttribute('persistent', ''));
  await page.locator('#start').click();
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeVisible();
  await dialog(page).getByRole('button', { name: 'Skip tour' }).click();
  await expect(dialog(page)).toBeHidden();
});

test('the page stays usable under the spotlight', async ({ page }) => {
  await page.locator('#page-action').click();
  await expect(page.locator('#page-out')).toHaveText('clicked');
  await expect(dialog(page)).toBeVisible();
});

test('a target removed while its step shows moves the tour on', async ({ page }) => {
  await page.locator('#search').evaluate((el) => el.remove());
  await expect(dialog(page)).toHaveAccessibleName('Export');
});

for (const theme of THEMES)
  test(`axe-clean while open in the ${theme} theme`, async ({ page }) => {
    await gotoInTheme(page, '/tour.html', theme, 'focsd-tour');
    await page.locator('#start').click();
    await expectAxeClean(page);
  });

test('start(index, opener) returns focus to the given opener, wherever focus was', async ({ page }) => {
  await page.locator('#tour').evaluate((el) => el.end());
  await page.evaluate(() => {
    document.activeElement?.blur();
    document.getElementById('tour').start(0, document.getElementById('page-action'));
  });
  await expect(dialog(page)).toHaveAccessibleName('Search');
  await page.keyboard.press('Escape');
  await expect(page.locator('#page-action')).toBeFocused();
});

test('start(index) announces the steps it jumps over', async ({ page }) => {
  await page.locator('#tour').evaluate((el) => el.start(1));
  await expectAnnounced(page, 'Skipped “Filters”: it is not on this page.');
  await expect(dialog(page)).toHaveAccessibleName('Export');
});

test('setting open and step drives the tour', async ({ page }) => {
  await page.locator('#tour').evaluate((el) => (el.step = 2));
  await expect(dialog(page)).toHaveAccessibleName('Export');
  await page.locator('#tour').evaluate((el) => (el.open = false));
  await expect(dialog(page)).toBeHidden();
  expect((await ev(page)).at(-1)).toEqual({ type: 'close', completed: false });
  await page.locator('#tour').evaluate((el) => Object.assign(el, { step: 0, open: true }));
  await expect(dialog(page)).toHaveAccessibleName('Search');
  await expect(page.locator('#tour')).toHaveAttribute('open', '');
});

test('removing the tour while it is open ends it', async ({ page }) => {
  const open = await page.evaluate(async () => {
    const tour = document.getElementById('tour');

    tour.remove();
    await new Promise((resolve) => setTimeout(resolve));

    return tour.open;
  });

  expect(open).toBe(false);
  expect((await ev(page)).at(-1)).toEqual({ type: 'close', completed: false });
});

test('Escape a popup inside the target handled closes only that popup', async ({ page }) => {
  await dialog(page).getByRole('button', { name: 'Next' }).click();
  await expect(dialog(page)).toHaveAccessibleName('Export');
  await page.locator('#export').focus();
  await expect(page.locator('focsd-tooltip [part~="tooltip"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('focsd-tooltip [part~="tooltip"]')).toBeHidden();
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
});

test('a target hidden while its step shows moves the tour on', async ({ page }) => {
  await page.locator('#search').evaluate((el) => (el.hidden = true));
  await expect(dialog(page)).toHaveAccessibleName('Export');
});

test('the progress total stays fixed when a missing target appears mid-tour', async ({ page }) => {
  await page.evaluate(() => {
    const filters = document.createElement('button');

    filters.id = 'missing';
    filters.textContent = 'Filters';
    document.querySelector('.tour-bar').append(filters);
  });
  await dialog(page).getByRole('button', { name: 'Next' }).click();
  await expect(dialog(page)).toHaveAccessibleName('Filters');
  await expect(dialog(page).getByText(/Step \d of/)).toHaveCount(0);
  await dialog(page).getByRole('button', { name: 'Next' }).click();
  await expect(dialog(page).getByText('Step 2 of 2')).toBeVisible();
});

test('moving the tour in the page keeps it going', async ({ page }) => {
  await page.evaluate(() => document.querySelector('main').prepend(document.getElementById('tour')));
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve)));
  await expect(dialog(page)).toHaveAccessibleName('Search');
  expect((await ev(page)).filter((e) => e.type === 'close')).toEqual([]);
});

test('an untitled missing step is announced by its number', async ({ page }) => {
  await page.locator('#tour').evaluate((el) => {
    el.end();
    el.steps = [{ target: '#nowhere', title: '', body: '' }, ...el.steps];
    el.start(0);
  });
  await expect(dialog(page)).toHaveAccessibleName('Search');
  await dialog(page).getByRole('button', { name: 'Next' }).click();
  await page.locator('#tour').evaluate((el) => el.start(0));
  await expectAnnounced(page, 'Step 1 skipped: it is not on this page.');
});

test('opening by property schedules no update after an update (Lit dev warning)', async ({ page }) => {
  const warnings = [];

  page.on('console', (m) => m.text().includes('scheduled an update') && warnings.push(m.text()));
  await page.locator('#tour').evaluate((el) => el.end());
  await page.locator('#tour').evaluate((el) => Object.assign(el, { step: 0, open: true }));
  await expect(dialog(page)).toHaveAccessibleName('Search');
  await page.locator('#tour').evaluate((el) => (el.step = 2));
  await expect(dialog(page)).toHaveAccessibleName('Export');
  await page.locator('#tour').evaluate((el) => (el.open = false));
  await expect(dialog(page)).toBeHidden();
  expect(warnings).toEqual([]);
});

test('ending while a step is still rendering fires no step change after close and drops the skip message', async ({ page }) => {
  const status = await page.evaluate(async () => {
    const tour = document.getElementById('tour');

    window.__ev = [];
    tour.next();
    tour.end();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    return tour.shadowRoot.querySelector('[role="status"]').textContent;
  });

  expect(status).toBe('');
  expect(await ev(page)).toEqual([{ type: 'close', completed: false }]);
});
