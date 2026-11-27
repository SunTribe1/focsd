import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { components } from '../src/data/catalogue.js';

// The landing page (src/pages/index.astro): sections, calls to action, live components, theme,
// keyboard path, the static hero background, and phone width.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const trackErrors = (page) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  return errors;
};

/** Every focsd- element on the page is defined (the editor loads when its card comes near). */
const allDefined = async (page) => {
  await page.locator('focsd-rich-text').scrollIntoViewIfNeeded();
  await page.waitForFunction(() =>
    [...document.querySelectorAll('main *')].every((el) => !el.localName.startsWith('focsd-') || customElements.get(el.localName)),
  );
  await page.evaluate(() => scrollTo(0, 0));
};

// Settled state: transitions would let axe sample colors mid-animation.
test.use({ contextOptions: { reducedMotion: 'reduce' } });

test('the sections, headings and calls to action are in place', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('Bring every user into focus.');

  for (const name of [
    'Go ahead, try them.',
    'Write it once. Use it in every stack.',
    'Accessibility, built into every component',
    'Your brand, not ours',
    'Built for AI assistants and agents',
    'Start with one component. Add the rest when you need them.',
  ])
    await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();

  const hero = page.locator('[data-lp-hero]');
  await expect(hero.getByRole('link', { name: 'Get started' })).toHaveAttribute('href', '/getting-started/installation/');
  await expect(hero.getByRole('link', { name: 'Browse components' })).toHaveAttribute('href', '/components/');
  await expect(hero).toContainText(`${components.length} components`);

  const nav = page.getByRole('navigation', { name: 'Main' });

  for (const [name, href] of [
    ['Docs', '/getting-started/installation/'],
    ['Components', '/components/'],
  ])
    await expect(nav.getByRole('link', { name })).toHaveAttribute('href', href);
  await expect(page.getByRole('link', { name: 'Focsd on GitHub' })).toHaveAttribute('href', /github\.com/);
  await expect(page.getByRole('contentinfo').getByRole('link', { name: `All ${components.length} components` })).toBeVisible();
  expect(errors).toEqual([]);
});

test('every internal link on the page resolves', async ({ page, request }) => {
  await page.goto('/');
  const hrefs = [...new Set(await page.locator('a[href^="/"]').evaluateAll((links) => links.map((a) => a.getAttribute('href'))))];
  expect(hrefs.length).toBeGreaterThan(20);

  for (const href of hrefs) expect((await request.get(href)).status(), href).toBe(200);
});

for (const theme of ['light', 'dark']) {
  test(`no accessibility violations in the ${theme} theme`, async ({ page }) => {
    const errors = trackErrors(page);
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-focsd-theme', theme);
    await allDefined(page);
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('the live components work: grid, chart, form with error summary, command palette', async ({ page }) => {
  await page.goto('/');
  await allDefined(page);
  await expect(page.locator('#lp-grid').getByRole('row')).toHaveCount(6);
  await expect(page.locator('#lp-chart').getByRole('img').first()).toBeVisible();

  const form = page.locator('#lp-form');
  await form.getByRole('button', { name: 'Create workspace' }).click();
  const summary = page.locator('#lp-form focsd-error-summary');
  await expect(summary.getByRole('link')).toHaveCount(3);
  await expect(summary.getByRole('link', { name: 'Enter a workspace name' })).toBeVisible();
  await form.getByRole('textbox', { name: 'Workspace name' }).fill('Northwind Studio');
  await form.getByRole('textbox', { name: 'Work email' }).fill('ana@northwind.studio');
  await form.getByRole('checkbox', { name: 'I accept the terms of service' }).check();
  await form.getByRole('button', { name: 'Create workspace' }).click();
  await expect(page.locator('#lp-form-status')).toHaveText('Workspace “Northwind Studio” is ready.');

  await page.getByRole('button', { name: 'Open command palette' }).click();
  await page.keyboard.type('invite');
  await page.keyboard.press('Enter');
  await expect(page.locator('#lp-command-status')).toHaveText('Ran “Invite a member”.');
});

test('the preset picker restyles the composition beside it', async ({ page }) => {
  await page.goto('/');
  await allDefined(page);
  const stage = page.locator('#lp-preset-stage');
  await page.getByRole('radiogroup', { name: 'Theme preset' }).getByRole('radio', { name: 'Harbor' }).click();
  await expect(stage).toHaveAttribute('data-focsd-brand', 'harbor');
});

test('the theme button switches light and dark and remembers it for the docs', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  const button = page.getByRole('button', { name: 'Dark theme' });
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await button.click();
  await expect(page.locator('html')).toHaveAttribute('data-focsd-theme', 'light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  await page.goto('/components/button/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('keyboard: the skip link comes first and moves to the content', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit tabs to links only with Option held, as Safari does by default.');
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  // <main> has no tabindex (a click inside it must not reset the Tab order); the skip link moves the
  // sequential focus starting point, so the next Tab lands on the first control in the content.
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-lp-hero]').getByRole('link', { name: 'Get started' })).toBeFocused();
});

test('the keyboard demo echoes the keys and names the focused control', async ({ page }) => {
  await page.goto('/');
  await allDefined(page);
  await page.locator('[data-lp-keys]').getByRole('radio', { name: 'Week' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-lp-keys-list]')).toContainText('→');
  await expect(page.locator('[data-lp-keys-focus]')).toHaveText('Segmented control: Calendar view');
});

test('the hero is the brand and a headline in a focus frame, on a soft glow with no canvas', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.lp-hero-brand')).toHaveText('focsd');
  await expect(page.locator('.lp-hero-glow')).toBeAttached();
  await expect(page.locator('.lp-hero canvas')).toHaveCount(0);
  await expect(page.locator('.lp-hero-frame .lp-focus-corner')).toHaveCount(4);
});

test('/?search= opens the docs search with the words in it', async ({ page }) => {
  await page.goto('/?search=date%20picker');
  const dialog = page.getByRole('dialog', { name: 'Search' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('textbox', { name: 'Search' })).toHaveValue('date picker', { timeout: 15_000 });
});

test('at 360 px nothing scrolls sideways and the menu opens', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/');
  await allDefined(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  const menu = page.getByRole('button', { name: 'Menu' });
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: 'Components' })).toBeVisible();
  await page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: 'Docs' }).focus();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await expect(page.getByRole('navigation', { name: 'Site' })).toBeHidden();
});
