import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

const URL = '/foundations/theme-builder/';

test.beforeEach(async ({ page }) => {
  await page.goto(URL);
  // Every builder control must be upgraded first: a value set on an undefined element shadows its setter.
  await page.waitForFunction(() =>
    ['focsd-button', 'focsd-select', 'focsd-color-picker', 'focsd-number-field', 'focsd-checkbox'].every((tag) => customElements.get(tag)),
  );
});

/** The builder's Focsd controls, found by their form name. */
const control = (page, tag, name) => page.locator(`.focsd-builder-controls ${tag}[name="${name}"]`);
const lightPicker = (page) => control(page, 'focsd-color-picker', 'light');
const darkPicker = (page) => control(page, 'focsd-color-picker', 'dark');
const radius = (page) => control(page, 'focsd-number-field', 'radius');
const start = (page) => control(page, 'focsd-select', 'start');
const density = (page) => control(page, 'focsd-select', 'density');
const links = (page) => control(page, 'focsd-checkbox', 'links');

/** Set a Focsd control's value and fire the events a person's pick would. */
const pick = (locator, value) =>
  locator.evaluate((host, next) => {
    host.value = next;
    host.dispatchEvent(new Event('input', { bubbles: true }));
    host.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);

const valueOf = (locator) => locator.evaluate((host) => host.value);

const css = (page) => page.getByTestId('theme-css').textContent();

test('the brand color restyles the light preview and the generated CSS', async ({ page }) => {
  await pick(lightPicker(page), '#0b5cad');
  const button = page.getByTestId('preview-light').locator('focsd-button[variant="action"]').first();
  await expect
    .poll(() => button.evaluate((el) => getComputedStyle(el.shadowRoot.querySelector('[part~="control"]') ?? el).backgroundColor))
    .toBe('rgb(11, 92, 173)');
  await expect.poll(() => css(page)).toContain('--focsd-action: #0b5cad;');
  expect(await css(page)).toContain('@layer focsd.brand');
});

test('the dark brand color only changes the dark theme', async ({ page }) => {
  await pick(darkPicker(page), '#8cc4ff');
  const text = await css(page);
  const dark = text.slice(text.indexOf("[data-focsd-theme='dark']"));
  expect(dark).toContain('--focsd-action: #8cc4ff;');
  expect(dark).toContain('--focsd-on-action: #111113;');
});

test('corner radius sets the control, surface and tag radii', async ({ page }) => {
  await pick(radius(page), '8');
  await expect.poll(() => css(page)).toContain('--focsd-radius-control: 8px;');
  expect(await css(page)).toContain('--focsd-radius-surface: 12px;');
});

test('keeps the theme link color unless links follow the brand', async ({ page }) => {
  await pick(lightPicker(page), '#0b5cad');
  await expect.poll(() => css(page)).not.toContain('--focsd-route');
  await links(page).click();
  await expect.poll(() => css(page)).toContain('--focsd-route: #0b5cad;');
});

test('reports contrast failures for a brand color that is too light for links', async ({ page }) => {
  await links(page).click();
  await pick(lightPicker(page), '#ffeb3b');
  const checks = page.getByTestId('checks-light');
  await expect(checks.getByRole('row', { name: /Links on the page/ })).toContainText('Fails');
  await expect(checks.getByRole('row', { name: /Text on button/ })).toContainText('Passes');
});

test('has no WCAG 2.2 AA violations', async ({ page }) => {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});

test('checks button edges on cards and in hover and pressed states too', async ({ page }) => {
  const checks = page.getByTestId('checks-light');

  for (const name of ['Button edge on cards', 'Hovered button edge', 'Pressed button edge']) {
    await expect(checks.getByRole('row', { name: new RegExp(name) })).toHaveCount(1);
  }

  await pick(lightPicker(page), '#f4f4f4');
  await expect(checks.getByRole('row', { name: /Button edge on cards/ })).toContainText('Fails');
});

test('"Copy for agents" copies a markdown description that ends with the CSS', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await pick(lightPicker(page), '#0b5cad');
  await pick(density(page), 'comfortable');
  await page.locator('[data-copy-agents]').click();
  await expect(page.locator('[data-copy-status]')).toHaveText('Copied for agents.');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toMatch(/^# Focsd theme/);
  expect(copied).toContain('Brand (action) color: #0b5cad');
  expect(copied).toMatch(/Text on button: \d+\.\d\d:1 \(needs 4\.5:1, passes\)/);
  expect(copied).toContain('comfortable: controls are 44px tall');
  expect(copied).toContain('Atkinson Hyperlegible Next');
  expect(copied).toContain(await css(page));
});

test('the generated CSS begins with the layer order statement', async ({ page }) => {
  expect((await css(page)).startsWith('@layer focsd.tokens, focsd.preset, focsd.brand;')).toBe(true);
});

test('"Start from" fills the colors and radius from a preset', async ({ page }) => {
  await pick(start(page), 'harbor');
  await expect.poll(() => valueOf(lightPicker(page))).toBe('#123b75');
  await expect.poll(() => valueOf(darkPicker(page))).toBe('#a8c6f2');
  await expect.poll(() => valueOf(radius(page))).toBe('2');
  await expect.poll(() => css(page)).toContain('--focsd-action: #123b75;');
  expect(await css(page)).toContain('--focsd-radius-control: 2px;');
  await pick(start(page), 'default');
  await expect.poll(() => valueOf(radius(page))).toBe('4');
});

test('a neutral tint, status colors and fonts reach the previews, the checks and the CSS', async ({ page }) => {
  await pick(control(page, 'focsd-select', 'neutral'), 'sand');
  await pick(control(page, 'focsd-select', 'sans'), 'system');
  await control(page, 'focsd-checkbox', 'custom-status').click();
  await pick(control(page, 'focsd-color-picker', 'status-critical'), '#e11d48');

  await expect.poll(() => css(page)).toContain('--focsd-ground:');
  expect(await css(page)).toContain('--focsd-font-sans: ui-sans-serif, system-ui, sans-serif;');
  expect(await css(page)).toContain('--focsd-critical:');
  expect(await css(page)).toContain('--focsd-critical: revert-layer;');

  const checks = page.getByTestId('checks-light');
  await expect(checks.getByRole('row', { name: /Text on the page/ })).toContainText('Passes');
  await expect(checks.getByRole('row', { name: /Critical text on the page/ })).toContainText('Passes');
  await expect.poll(() => page.getByTestId('preview-light').evaluate((el) => getComputedStyle(el).fontFamily)).toContain('system-ui');
});

test('"Copy tokens (JSON)" copies the shared and per-theme tokens', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await pick(control(page, 'focsd-select', 'neutral'), 'slate');
  await page.locator('[data-copy-json]').click();
  await expect(page.locator('[data-copy-status]')).toHaveText('Copied the tokens as JSON.');
  const json = JSON.parse(await page.evaluate(() => navigator.clipboard.readText()));
  expect(json.shared['radius-control']).toBe('4px');
  expect(json.light.ground).toMatch(/^#/);
  expect(json.dark.action).toMatch(/^#/);
});
