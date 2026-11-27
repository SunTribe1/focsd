import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { pressTab } from '../../../apps/playground/e2e/fixtures/keys.js';
import { expectHexClose, floorCss, hexOf, mount, propOf } from './helpers.mjs';

test.describe('theme selection', () => {
  test('light is the default', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await mount(page);
    expectHexClose(expect, await hexOf(page, 'body', '--focsd-ground'), '#f4f6f5');
    expectHexClose(expect, await hexOf(page, 'body', '--focsd-ink'), '#141a18');
  });

  test('follows prefers-color-scheme: dark', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await mount(page);
    expectHexClose(expect, await hexOf(page, 'body', '--focsd-ground'), '#111113');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('dark');
  });

  test('explicit attribute beats the OS preference', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await mount(page);
    await page.evaluate(() => document.documentElement.setAttribute('data-focsd-theme', 'light'));
    expectHexClose(expect, await hexOf(page, 'body', '--focsd-ground'), '#f4f6f5');
  });

  test('a subtree can carry the opposite theme (Review Focus 1)', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await mount(page, '<section id="light" data-focsd-theme="light"><p id="inner">x</p></section><section id="rest"></section>');
    expectHexClose(expect, await hexOf(page, '#inner', '--focsd-ground'), '#f4f6f5');
    expectHexClose(expect, await hexOf(page, '#inner', '--focsd-route'), '#0a5e73');
    expectHexClose(expect, await hexOf(page, '#rest', '--focsd-ground'), '#111113');
  });

  test('prefers-contrast: more wins over dark (Review Focus 3)', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark', contrast: 'more' });
    await mount(page);
    expectHexClose(expect, await hexOf(page, 'body', '--focsd-ground'), '#ffffff');
    expectHexClose(expect, await hexOf(page, 'body', '--focsd-ink'), '#000000');
    expect(await propOf(page, 'body', '--focsd-border-width')).toBe('2px');
  });

  test('unlayered consumer CSS overrides tokens (Review Focus 4)', async ({ page }) => {
    await mount(page, '', ':root { --focsd-action: #ff0000; }');
    expectHexClose(expect, await hexOf(page, 'body', '--focsd-action'), '#ff0000');
  });
});

test.describe('density and motion', () => {
  test('default density, and compact on a subtree', async ({ page }) => {
    await mount(page, '<div id="c" data-focsd-density="compact"></div>');
    expect(await propOf(page, 'body', '--focsd-control-height')).toBe('36px');
    expect(await propOf(page, '#c', '--focsd-control-height')).toBe('32px');
    expect(await propOf(page, '#c', '--focsd-text-body-size')).toBe('0.875rem');
  });

  test('comfortable and default can be restored inside a compact tree', async ({ page }) => {
    await mount(
      page,
      '<div id="c" data-focsd-density="compact"><div id="back" data-focsd-density="comfortable"></div><div id="std" data-focsd-density="default"></div></div>',
    );
    expect(await propOf(page, '#back', '--focsd-control-height')).toBe('44px');
    expect(await propOf(page, '#back', '--focsd-text-body-size')).toBe('1.0625rem');
    expect(await propOf(page, '#std', '--focsd-control-height')).toBe('36px');
  });

  test('reduced motion zeroes durations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mount(page);
    expect(await propOf(page, 'body', '--focsd-duration-base')).toBe('0ms');
  });

  test('normal motion keeps durations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await mount(page);
    expect(await propOf(page, 'body', '--focsd-duration-base')).toBe('160ms');
  });
});

const defineProbe = (page, css) =>
  page.evaluate((text) => {
    customElements.define(
      'focsd-probe',
      class extends HTMLElement {
        constructor() {
          super();
          const root = this.attachShadow({ mode: 'open' });
          const sheet = new CSSStyleSheet();
          sheet.replaceSync(text);
          root.adoptedStyleSheets = [sheet];
          root.innerHTML = '<button part="control">Go</button>';
        }
      },
    );
  }, css);

/** Tab from a plain button onto the probe's button, with only the floor CSS loaded. */
const tabToProbe = async (page) => {
  await page.setContent('<!doctype html><button id="first">first</button><focsd-probe></focsd-probe>');
  await defineProbe(page, await floorCss());
  await page.locator('#first').focus();
  await pressTab(page);
};

test.describe('accessibility floor', () => {
  test('Tab with no token CSS loaded makes the control :focus-visible', async ({ page }) => {
    await tabToProbe(page);

    const focused = await page.evaluate(() =>
      document.querySelector('focsd-probe').shadowRoot.querySelector('button').matches(':focus-visible'),
    );

    expect(focused).toBe(true);
  });

  test('shows the focus ring with no token CSS loaded', async ({ page, browserName }) => {
    // Playwright's WebKit reports :focus-visible as matching but never applies its styles to
    // getComputedStyle (reproduced with a plain light-DOM button). Ring colors are verified in
    // Chromium and Firefox; Safari needs a manual check.
    test.skip(browserName === 'webkit', 'WebKit :focus-visible computed style not observable');
    await tabToProbe(page);

    const ring = await page.evaluate(
      () => getComputedStyle(document.querySelector('focsd-probe').shadowRoot.querySelector('button')).boxShadow,
    );

    expect(ring).toContain('rgb(242, 183, 5)');
    expect(ring).toContain('rgb(20, 26, 24)');
  });

  test('forced colors swap the ring for a Highlight outline', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'forced-colors emulation is Chromium-only');
    await page.emulateMedia({ forcedColors: 'active' });
    await page.setContent('<!doctype html><button id="first">first</button><focsd-probe></focsd-probe>');
    await defineProbe(page, await floorCss());
    await page.locator('#first').focus();
    await page.keyboard.press('Tab');

    const outline = await page.evaluate(
      () => getComputedStyle(document.querySelector('focsd-probe').shadowRoot.querySelector('button')).outlineStyle,
    );

    expect(outline).toBe('solid');
  });
});

const readDist = (f) => readFile(new URL(`../dist/${f}`, import.meta.url), 'utf8');
const brand = (page, name) => page.evaluate((n) => document.documentElement.setAttribute('data-focsd-brand', n), name);
const theme = (page, t) => page.evaluate((v) => document.documentElement.setAttribute('data-focsd-theme', v), t);
let presetsCss;
let data;

test.beforeAll(async () => {
  presetsCss = await readDist('presets.css');
  data = JSON.parse(await readDist('presets.json'));
});

test.describe('theme presets (wave 16)', () => {
  test('--focsd-action on <html> changes with the brand, in light and dark', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await mount(page, '', presetsCss);
    expectHexClose(expect, await hexOf(page, 'body', '--focsd-action'), data.default.swatches.light.action);
    await brand(page, 'harbor');
    expectHexClose(expect, await hexOf(page, 'body', '--focsd-action'), data.presets.harbor.swatches.light.action);
    expect(await propOf(page, 'html', '--focsd-radius-surface')).toBe('4px');
    expect(await propOf(page, 'html', '--focsd-font-sans')).toMatch(/^"IBM Plex Sans"/);
    await page.emulateMedia({ colorScheme: 'dark' });
    expectHexClose(expect, await hexOf(page, 'body', '--focsd-action'), data.presets.harbor.swatches.dark.action);
    await theme(page, 'light');
    expectHexClose(expect, await hexOf(page, 'body', '--focsd-ground'), data.presets.harbor.swatches.light.ground);
  });

  test('a nested data-focsd-theme inside a branded page uses the preset for that theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await mount(page, '<section id="d" data-focsd-theme="dark"><section id="l" data-focsd-theme="light"></section></section>', presetsCss);
    await brand(page, 'mineral');
    expectHexClose(expect, await hexOf(page, '#d', '--focsd-action'), data.presets.mineral.swatches.dark.action);
    expectHexClose(expect, await hexOf(page, '#l', '--focsd-action'), data.presets.mineral.swatches.light.action);
  });
});

test.describe('theme presets: contrast and overrides (wave 16)', () => {
  test('colors revert under data-focsd-theme="contrast"; radius stays', async ({ page }) => {
    await mount(page, '', presetsCss);
    await theme(page, 'contrast');
    const plain = await hexOf(page, 'body', '--focsd-action');
    await brand(page, 'mineral');
    expect(await hexOf(page, 'body', '--focsd-action')).toBe(plain);
    expectHexClose(expect, await hexOf(page, 'body', '--focsd-ground'), '#ffffff');
    expect(await propOf(page, 'html', '--focsd-radius-control')).toBe('4px');
    expect(await propOf(page, 'html', '--focsd-font-sans')).toMatch(/^"Red Hat Text"/);
  });

  test('colors revert under emulated prefers-contrast: more', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark', contrast: 'more' });
    await mount(page, '', presetsCss);
    await brand(page, 'signal');
    expectHexClose(expect, await hexOf(page, 'body', '--focsd-ground'), '#ffffff');
    expectHexClose(expect, await hexOf(page, 'body', '--focsd-ink'), '#000000');
    expect(await hexOf(page, 'body', '--focsd-action')).not.toBe(data.presets.signal.swatches.dark.action);
    expect(await propOf(page, 'html', '--focsd-radius-surface')).toBe('12px');
  });

  test('a focsd.brand override beats a preset, whatever the source order', async ({ page }) => {
    const builder = '@layer focsd.tokens, focsd.preset, focsd.brand;\n@layer focsd.brand { :root { --focsd-action: #ff0000; } }';
    await mount(page, '', `${builder}\n${presetsCss}`);
    await brand(page, 'mineral');
    expectHexClose(expect, await hexOf(page, 'body', '--focsd-action'), '#ff0000');
  });
});
