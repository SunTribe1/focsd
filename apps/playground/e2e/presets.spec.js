import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test } from './fixtures/test.js';
import { expectAxeClean } from './fixtures/axe.js';

const tokensIndex = readFileSync(new URL('../../../packages/tokens/dist/index.js', import.meta.url), 'utf8');
const noFlashScript = JSON.parse(/** @type {string} */ (/export const noFlashScript = (".*");/.exec(tokensIndex)?.[1]));

const noFlashHash = JSON.parse(/** @type {string} */ (/export const noFlashHash = (".*");/.exec(tokensIndex)?.[1]));

const html = (page, name) => page.evaluate((n) => document.documentElement.getAttribute(n), name);

const open = async (page) => {
  await page.goto('/presets.html');
  await page.waitForFunction(() => window.__ready);
};

const toggle = (page) => page.locator('#toggle').getByRole('radiogroup', { name: 'Color theme' });
const picker = (page) => page.locator('#picker').getByRole('radiogroup', { name: 'Theme preset' });

test.beforeEach(async ({ page }) => {
  // Each test starts from an empty store, but a reload inside a test keeps what the test stored.
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.clear();
      sessionStorage.setItem('seeded', '1');
    }
  });
});

test('the page inlines the tokens no-flash snippet verbatim', async ({ page }) => {
  await open(page);
  expect(await page.evaluate(() => document.querySelector('#no-flash')?.textContent)).toBe(noFlashScript);
});

test('the inline snippet text, untrimmed, hashes to noFlashHash (the CSP source)', async ({ page }) => {
  await open(page);
  const text = await page.evaluate(() => document.querySelector('#no-flash')?.textContent ?? '');
  expect(`sha256-${createHash('sha256').update(text).digest('base64')}`).toBe(noFlashHash);
});

test('toggle: a named radio group of Light, Dark, System and High contrast, System checked by default', async ({ page }) => {
  await open(page);
  const group = toggle(page);
  await expect(group.getByRole('radio')).toHaveText(['Light', 'Dark', 'System', 'High contrast']);
  await expect(group.getByRole('radio', { name: 'System' })).toBeChecked();
  await expect(page.locator('#toggle-contrast').getByRole('radio')).toHaveText(['Light', 'Dark', 'System', 'High contrast']);
});

test('toggle keyboard: one tab stop, arrows move and choose, Home and End, wrapping', async ({ page }) => {
  await open(page);
  const group = toggle(page);
  const radios = group.getByRole('radio');
  await expect(radios.nth(2)).toHaveAttribute('tabindex', '0');
  await expect(radios.nth(0)).toHaveAttribute('tabindex', '-1');
  await radios.nth(2).focus();
  await page.keyboard.press('ArrowRight');
  await expect(radios.nth(3)).toBeFocused();
  await expect(radios.nth(3)).toBeChecked();
  expect(await html(page, 'data-focsd-theme')).toBe('contrast');
  await page.keyboard.press('ArrowRight');
  await expect(radios.nth(0)).toBeFocused();
  await expect(radios.nth(0)).toBeChecked();
  expect(await html(page, 'data-focsd-theme')).toBe('light');
  await page.keyboard.press('ArrowDown');
  await expect(radios.nth(1)).toBeChecked();
  expect(await html(page, 'data-focsd-theme')).toBe('dark');
  await page.keyboard.press('End');
  await expect(radios.nth(3)).toBeFocused();
  expect(await html(page, 'data-focsd-theme')).toBe('contrast');
  await page.keyboard.press('Home');
  await expect(radios.nth(0)).toHaveAttribute('tabindex', '0');
  await expect(radios.nth(1)).toHaveAttribute('tabindex', '-1');
});

test('toggle in right-to-left: ArrowLeft moves forward', async ({ page }) => {
  await open(page);
  const radios = page.locator('#toggle-rtl').getByRole('radio');
  await radios.nth(0).click();
  await page.keyboard.press('ArrowLeft');
  await expect(radios.nth(1)).toBeChecked();
});

test('toggle persists across a reload, fires change, and every toggle follows', async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    window.__changes = [];
    document.querySelector('#toggle')?.addEventListener('change', (e) => window.__changes.push(e.target.value));
  });
  await toggle(page).getByRole('radio', { name: 'Dark' }).click();
  expect(await page.evaluate(() => window.__changes)).toEqual(['dark']);
  expect(await page.evaluate(() => localStorage.getItem('focsd-theme'))).toBe('dark');
  await expect(page.locator('#toggle-contrast').getByRole('radio', { name: 'Dark' })).toBeChecked();
  await page.reload();
  await page.waitForFunction(() => window.__ready);
  await expect(toggle(page).getByRole('radio', { name: 'Dark' })).toBeChecked();
  await toggle(page).getByRole('radio', { name: 'System' }).click();
  expect(await page.evaluate(() => localStorage.getItem('focsd-theme'))).toBeNull();
  expect(await html(page, 'data-focsd-theme')).toBeNull();
});

const STORED = { 'focsd-theme': 'dark', 'focsd-brand': 'harbor' };

const seedStore = (page) =>
  page.addInitScript((items) => {
    for (const [k, v] of Object.entries(items)) localStorage.setItem(k, v);
  }, STORED);

test('no flash, snippet alone: the stored theme and preset are set before any module runs', async ({ page }) => {
  await seedStore(page);
  await page.goto('/no-flash.html');
  // window.__seen was recorded by a classic inline script right after the snippet; the page has no components.
  expect(await page.evaluate(() => window.__seen)).toEqual(['dark', 'harbor']);
});

test('no flash, without the snippet the same page records nothing (so the test above can fail)', async ({ page }) => {
  await seedStore(page);
  await page.route('**/no-flash.html', async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(/<script id="no-flash">[\s\S]*?<\/script>/, '');
    await route.fulfill({ response, body });
  });
  await page.goto('/no-flash.html');
  expect(await page.evaluate(() => window.__seen)).toEqual([null, null]);
});

test('picker: Wayfinding first, a name per card, choosing sets the brand and the check mark', async ({ page }) => {
  await open(page);
  const group = picker(page);
  await expect(group.getByRole('radio')).toHaveText(['Wayfinding (default)', 'Harbor', 'Signal', 'Mineral', 'Prismatic']);
  await expect(group.getByRole('radio', { name: 'Wayfinding (default)' })).toBeChecked();
  const before = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--focsd-action'));
  await group.getByRole('radio', { name: 'Signal' }).click();
  expect(await html(page, 'data-focsd-brand')).toBe('signal');
  expect(await page.evaluate(() => localStorage.getItem('focsd-brand'))).toBe('signal');
  await expect(page.locator('#picker [part~="option-checked"] [part~="check"]')).toHaveCount(1);
  await expect(page.locator('#picker [part~="option-checked"]')).toContainText('Signal');
  const after = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--focsd-action'));
  expect(after).not.toBe(before);
  await page.keyboard.press('ArrowLeft');
  expect(await html(page, 'data-focsd-brand')).toBe('harbor');
  await page.keyboard.press('Home');
  expect(await html(page, 'data-focsd-brand')).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('focsd-brand'))).toBeNull();
});

test('picker swatches follow the scheme, and `presets` narrows the list', async ({ page }) => {
  await open(page);
  const chip = page.locator('#picker [role="radio"]').nth(1).locator('.chip').first();
  const light = await chip.evaluate((el) => getComputedStyle(el).backgroundColor);
  await toggle(page).getByRole('radio', { name: 'Dark' }).click();
  await expect.poll(() => chip.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(light);
  await page.evaluate(() => {
    const el = /** @type {any} */ (document.querySelector('#picker'));
    el.presets = ['mineral', 'nope', 'signal'];
  });
  await expect(picker(page).getByRole('radio')).toHaveText(['Wayfinding (default)', 'Mineral', 'Signal']);
});

test('storage that throws is survived: choices still apply', async ({ page }) => {
  await page.addInitScript(() => {
    for (const name of ['getItem', 'setItem', 'removeItem'])
      Storage.prototype[name] = () => {
        throw new DOMException('denied', 'SecurityError');
      };
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await open(page);
  await toggle(page).getByRole('radio', { name: 'Dark' }).click();
  await picker(page).getByRole('radio', { name: 'Mineral' }).click();
  expect(await html(page, 'data-focsd-theme')).toBe('dark');
  expect(await html(page, 'data-focsd-brand')).toBe('mineral');
  expect(errors).toEqual([]);
});

test('focus ring on the focused option, and a Highlight border in forced colors', async ({ page }) => {
  await open(page);
  const checked = toggle(page).getByRole('radio', { name: 'System' });
  await checked.focus();
  await page.keyboard.press('ArrowLeft');
  const dark = toggle(page).getByRole('radio', { name: 'Dark' });
  await expect(dark).toBeFocused();
  // The two-tone focus ring: a 1px gap in the ground color, then a 2px ring.
  expect(await dark.evaluate((el) => getComputedStyle(el).boxShadow)).toContain('0px 0px 0px 2px');
  await page.emulateMedia({ forcedColors: 'active' });
  expect(await dark.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe('3px');
  expect(await dark.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid');
});

test('axe: no violations in the default theme', async ({ page }) => {
  await open(page);
  await page.evaluate(() => document.fonts.ready);
  await expectAxeClean(page);
});

const BRAND_NAMES = ['harbor', 'signal', 'mineral'];

const actionOf = (page, selector) =>
  page.locator(selector).evaluate((el) => getComputedStyle(el).getPropertyValue('--focsd-action').trim());

test.describe('high contrast overrides every preset (chromium)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'one engine is enough for the loop');

  for (const brand of BRAND_NAMES) {
    test(`${brand}: contrast theme, nested contrast, and OS dark with prefers-contrast restore the default colors`, async ({ page }) => {
      await open(page);
      const root = 'html';
      await page.evaluate(() => document.documentElement.setAttribute('data-focsd-theme', 'contrast'));
      const plain = await actionOf(page, root);
      await page.evaluate((b) => document.documentElement.setAttribute('data-focsd-brand', b), brand);
      expect(await actionOf(page, root), 'contrast on the branded element').toBe(plain);

      // A branded element nested under a contrast ancestor.
      await page.evaluate((b) => {
        document.documentElement.removeAttribute('data-focsd-brand');
        document.body.insertAdjacentHTML(
          'beforeend',
          `<div id="c" data-focsd-theme="contrast"><div id="n" data-focsd-brand="${b}"></div></div>`,
        );
      }, brand);
      expect(await actionOf(page, '#n'), 'branded under contrast').toBe(await actionOf(page, '#c'));

      // No attribute: the OS asks for dark and more contrast.
      await page.evaluate(() => {
        document.documentElement.removeAttribute('data-focsd-theme');
        document.querySelector('#c')?.remove();
      });
      await page.emulateMedia({ colorScheme: 'dark', contrast: 'more' });
      const osPlain = await actionOf(page, root);
      await page.evaluate((b) => document.documentElement.setAttribute('data-focsd-brand', b), brand);
      expect(await actionOf(page, root), 'prefers-contrast: more').toBe(osPlain);
    });
  }
});

test('toggle follows a contrast theme set on the target: High contrast is checked and keeps the tab stop', async ({ page }) => {
  await open(page);
  await page.evaluate(() => document.documentElement.setAttribute('data-focsd-theme', 'contrast'));
  const radios = toggle(page).getByRole('radio');
  await expect(radios.nth(3)).toBeChecked();
  await expect(radios.nth(3)).toHaveAttribute('tabindex', '0');
  await expect(radios.first()).toHaveAttribute('tabindex', '-1');
});

test('a changed `target` is re-resolved: the control follows and applies to the new target', async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div id="ta"></div><div id="tb"></div><focsd-theme-toggle id="tt" target="#ta" storage-key-prefix="t1-"></focsd-theme-toggle>',
    );
  });
  const radios = page.locator('#tt').getByRole('radio');
  await radios.nth(1).click();
  await expect(page.locator('#ta')).toHaveAttribute('data-focsd-theme', 'dark');
  await page.evaluate(() => document.querySelector('#tt')?.setAttribute('target', '#tb'));
  await radios.nth(0).click();
  await expect(page.locator('#tb')).toHaveAttribute('data-focsd-theme', 'light');
  await expect(page.locator('#ta')).toHaveAttribute('data-focsd-theme', 'dark');
  // The new target is watched, the old one no longer is.
  await page.evaluate(() => document.querySelector('#tb')?.setAttribute('data-focsd-theme', 'dark'));
  await expect(radios.nth(1)).toBeChecked();
  await page.evaluate(() => document.querySelector('#ta')?.setAttribute('data-focsd-theme', 'light'));
  await expect(radios.nth(1)).toBeChecked();
});

test('an author-set `value` wins over storage on connect and is persisted', async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    localStorage.setItem('t2-theme', 'light');
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div id="tp"></div><focsd-theme-toggle id="tv" value="dark" target="#tp" storage-key-prefix="t2-"></focsd-theme-toggle>',
    );
  });
  await expect(page.locator('#tp')).toHaveAttribute('data-focsd-theme', 'dark');
  await expect(page.locator('#tv').getByRole('radio', { name: 'Dark' })).toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem('t2-theme'))).toBe('dark');
});
