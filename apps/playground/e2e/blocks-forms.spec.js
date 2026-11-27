import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test, ready, settle } from './fixtures/test.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';
import { expectAnnounced, recordAnnouncements } from './fixtures/announcements.js';
import { pressTab } from './fixtures/keys.js';

// The settings, sign-in and empty-app blocks (packages/cli/blocks), rendered by apps/playground/blocks/*.html.
// The dashboard block's cases live in blocks.spec.js.
test.use({ contextOptions: { reducedMotion: 'reduce' } });

const SIZES = { phone: { width: 360, height: 740 }, desktop: { width: 1280, height: 800 } };

/** The first element each block defines last, so waiting for it means the block's module has run. */
const READY = { settings: 'focsd-error-summary', 'sign-in': 'focsd-error-summary', 'empty-app': 'focsd-empty-state' };

/** Open a block page and wait until its elements are defined and the body is injected. */
async function openBlock(page, name) {
  await page.goto(`/blocks/${name}.html`);
  await ready(page, 'focsd-button', READY[name]);
  await page.evaluate(() => document.fonts.ready);
}

const undefinedTags = (page) => page.evaluate(() => document.querySelectorAll(':not(:defined)').length);

for (const name of Object.keys(READY)) {
  test.describe(`${name} block`, () => {
    for (const [size, viewport] of Object.entries(SIZES)) {
      for (const theme of THEMES) {
        test(`axe clean, ${theme}, ${size}`, async ({ page }) => {
          await page.setViewportSize(viewport);
          await gotoInTheme(page, `/blocks/${name}.html`, theme, READY[name]);
          await expectAxeClean(page);
        });
      }
    }

    test('no console errors, no undefined custom elements', async ({ page }) => {
      const problems = [];
      page.on('pageerror', (error) => problems.push(error.message));
      page.on('console', (message) => message.type() === 'error' && problems.push(message.text()));
      await openBlock(page, name);
      await settle(page);
      expect(problems).toEqual([]);
      expect(await undefinedTags(page)).toBe(0);
    });

    test('no horizontal scroll at 360 px or at 320 px (400 % zoom)', async ({ page }) => {
      for (const width of [360, 320]) {
        await page.setViewportSize({ width, height: 740 });
        await openBlock(page, name);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${width}px`).toBeLessThanOrEqual(0);
      }
    });
  });
}

test.describe('settings block', () => {
  test.use({ viewport: SIZES.desktop });

  test('an invalid email blocks the save and the summary takes focus, with the message inline too', async ({ page }) => {
    await openBlock(page, 'settings');
    await page.locator('#email').locator('input').fill('maya@');
    await page.getByRole('button', { name: 'Save changes' }).click();
    const summary = page.locator('focsd-error-summary');
    await expect(summary).toBeFocused();
    await expect(summary.getByRole('link', { name: 'Enter an email address in the format name@example.com' })).toBeVisible();
    await expect(page.locator('#email')).toHaveJSProperty('error', 'Enter an email address in the format name@example.com');
    await expect(page.locator('#save-status')).toHaveText('');
  });

  test('the summary link focuses the field', async ({ page }) => {
    await openBlock(page, 'settings');
    await page.locator('#email').locator('input').fill('');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await page.locator('focsd-error-summary').getByRole('link', { name: 'Enter your email address' }).click();
    await expect(page.locator('#email').locator('input')).toBeFocused();
  });

  test('an error on another tab opens that tab', async ({ page }) => {
    await openBlock(page, 'settings');
    await page.locator('#email').locator('input').fill('nope');
    await page.getByRole('tab', { name: 'Security' }).click();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('tab', { name: 'Profile' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#email')).toBeVisible();
  });

  test('a valid save announces "Settings saved" and sends nothing', async ({ page }) => {
    await recordAnnouncements(page);
    const posts = [];
    page.on('request', (request) => request.method() === 'POST' && posts.push(request.url()));
    await openBlock(page, 'settings');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expectAnnounced(page, 'Settings saved');
    await expect(page.locator('#save-status')).toHaveText('Settings saved');
    await settle(page);
    expect(posts).toEqual([]);
  });
});

test.describe('settings block save event', () => {
  test.use({ viewport: SIZES.desktop });

  /** Add a listener for settings:save before the block's own sample handler runs its course. */
  const onSave = (page, body) =>
    page.evaluate((code) => document.getElementById('settings-form').addEventListener('settings:save', new Function('event', code)), body);

  test('says the page is a sample, and saves nothing until wired', async ({ page }) => {
    await openBlock(page, 'settings');
    await expect(page.getByText('This is a sample page: Save sends nothing')).toBeVisible();
  });

  test('announces "saved" only after the promises handed to until() resolve', async ({ page }) => {
    await openBlock(page, 'settings');
    await onSave(page, 'window.release = null; event.detail.until(new Promise((r) => { window.release = r; }));');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    await expect(page.locator('#save-status')).toHaveText('');
    await page.evaluate(() => window.release());
    await expect(page.locator('#save-status')).toHaveText('Settings saved');
  });

  test('does not announce "saved" when a handler cancels the event', async ({ page }) => {
    await openBlock(page, 'settings');
    await onSave(page, 'event.preventDefault();');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await settle(page);
    await expect(page.locator('#save-status')).toHaveText('');
  });

  test('says it could not save when a promise rejects', async ({ page }) => {
    await openBlock(page, 'settings');
    await onSave(page, "event.detail.until(Promise.reject(new Error('offline')));");
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.locator('#save-status')).toHaveText('Settings could not be saved. Try again.');
  });
});

test.describe('block targets at the default density', () => {
  test.use({ viewport: SIZES.desktop });

  /** Every visible target is at least 24 px (WCAG 2.5.8); the controls are at least the 36 px default density. */
  async function expectTargets(page, locators, minHeight) {
    for (const locator of locators) {
      const box = await locator.boundingBox();
      // Firefox lays out 36 px as 35.99997 px; allow a sub-pixel rounding error.
      expect(box.height, await locator.evaluate((el) => el.outerHTML.slice(0, 60))).toBeGreaterThanOrEqual(minHeight - 0.01);
      expect(box.width).toBeGreaterThanOrEqual(24);
    }
  }

  test('settings: tabs, switch, select and Save', async ({ page }) => {
    await openBlock(page, 'settings');
    await expectTargets(page, [page.getByRole('tab', { name: 'Profile' }), page.getByRole('button', { name: 'Save changes' })], 36);
    await page.getByRole('tab', { name: 'Notifications' }).click();
    await expectTargets(page, [page.getByRole('switch', { name: 'Comments and mentions' })], 24);
    await page.getByRole('tab', { name: 'Profile' }).click();
    await expectTargets(page, [page.locator('focsd-select').first()], 36);
  });

  test('sign-in: the button and the checkbox row', async ({ page }) => {
    await openBlock(page, 'sign-in');
    await expectTargets(page, [page.getByRole('button', { name: 'Sign in' })], 36);
    await expectTargets(page, [page.locator('focsd-checkbox')], 24);
  });
});

test.describe('blocks in forced colors', () => {
  test.use({ viewport: SIZES.desktop });

  for (const name of Object.keys(READY)) {
    test(`${name}: text and borders stay visible`, async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'forced-colors emulation is Chromium-only');
      await page.emulateMedia({ forcedColors: 'active' });
      await openBlock(page, name);

      // In forced colors the browser replaces every color with a system color: the page text must
      // not be the canvas color, and the main landmark and primary action must still have size.
      const { text, canvas } = await page.evaluate(() => ({
        text: getComputedStyle(document.querySelector('h1')).color,
        canvas: getComputedStyle(document.body).backgroundColor,
      }));

      expect(text).not.toBe(canvas);
      await expect(page.getByRole('main')).toBeVisible();
      await expectAxeClean(page);
    });
  }
});

test.describe('settings block layout', () => {
  test.use({ viewport: SIZES.desktop });

  test('tabs: arrow keys move between Profile, Notifications and Security', async ({ page }) => {
    await openBlock(page, 'settings');
    await page.getByRole('tab', { name: 'Profile' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Notifications' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('switch', { name: 'Comments and mentions' })).toBeVisible();
  });

  test('labels sit above the controls at 360 px and beside them at 1280 px', async ({ page }) => {
    const labelBesideControl = () =>
      page.locator('#name').evaluate((host) => {
        const label = host.shadowRoot.querySelector('[part~="label"]').getBoundingClientRect();
        const input = host.shadowRoot.querySelector('input').getBoundingClientRect();

        return label.right <= input.left + 1 && Math.abs(label.top - input.top) < input.height;
      });

    await openBlock(page, 'settings');
    expect(await labelBesideControl()).toBe(true);
    await page.setViewportSize(SIZES.phone);
    await settle(page);
    expect(await labelBesideControl()).toBe(false);
  });

  test('the sidebar is a drawer at 360 px and a column at 1280 px', async ({ page }) => {
    await openBlock(page, 'settings');
    await expect(page.getByRole('navigation', { name: 'Workspace' }).first()).toBeVisible();
    await page.setViewportSize(SIZES.phone);
    await settle(page);
    await expect(page.getByRole('link', { name: 'Projects' })).toBeHidden();
  });

  test('exactly one main, one banner and a skip link first', async ({ page }) => {
    await openBlock(page, 'settings');
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('banner')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await pressTab(page);
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  });
});

test.describe('sign-in block', () => {
  test.use({ viewport: SIZES.desktop });

  test('password managers: the right autocomplete tokens reach the real inputs', async ({ page }) => {
    await openBlock(page, 'sign-in');

    const tokens = await page.evaluate(() =>
      ['email', 'password'].map((id) => {
        const input = document.getElementById(id).shadowRoot.querySelector('input');

        // The attribute is what password managers read; Firefox's IDL getter returns '' for it.
        return { id, type: input.type, autocomplete: input.getAttribute('autocomplete') };
      }),
    );

    expect(tokens).toEqual([
      { id: 'email', type: 'email', autocomplete: 'username' },
      { id: 'password', type: 'password', autocomplete: 'current-password' },
    ]);
  });

  test('empty submit lists both errors in the summary, focuses it, and marks both fields', async ({ page }) => {
    await openBlock(page, 'sign-in');
    await page.getByRole('button', { name: 'Sign in' }).click();
    const summary = page.locator('focsd-error-summary');
    await expect(summary).toBeFocused();
    await expect(summary.getByRole('link')).toHaveText(['Enter your email address', 'Enter your password']);
    await expect(page.locator('#email')).toHaveJSProperty('error', 'Enter your email address');
    await expect(page.locator('#password')).toHaveJSProperty('error', 'Enter your password');
    await summary.getByRole('link', { name: 'Enter your password' }).click();
    await expect(page.locator('#password').locator('input')).toBeFocused();
  });
});

test.describe('sign-in block submit', () => {
  test.use({ viewport: SIZES.desktop });

  test('a malformed email is named, a correct one passes', async ({ page }) => {
    await openBlock(page, 'sign-in');
    await page.locator('#email').locator('input').fill('maya.example.com');
    await page.locator('#password').locator('input').fill('correct horse');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('focsd-error-summary').getByRole('link')).toHaveText([
      'Enter an email address in the format name@example.com',
    ]);
    await page.locator('#email').locator('input').fill('maya@northwind.example');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('focsd-error-summary')).toBeHidden();
    await expect(page.locator('#sign-in-status')).toHaveText('Sample page: nothing was sent.');
  });

  test('submitting sends no request and keeps the page', async ({ page }) => {
    const sent = [];
    await openBlock(page, 'sign-in');
    page.on('request', (request) => request.method() !== 'GET' && sent.push(`${request.method()} ${request.url()}`));
    await page.locator('#email').locator('input').fill('maya@northwind.example');
    await page.locator('#password').locator('input').fill('correct horse');
    await page.getByRole('checkbox', { name: 'Remember me' }).check();
    await page.getByRole('button', { name: 'Sign in' }).click();
    await settle(page);
    expect(sent).toEqual([]);
    expect(new URL(page.url()).pathname).toBe('/blocks/sign-in.html');
  });
});

test.describe('sign-in block page', () => {
  test.use({ viewport: SIZES.desktop });

  test('one main, a heading, the reset link, and the show-password toggle is a pressed button', async ({ page }) => {
    await openBlock(page, 'sign-in');
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in to Northwind' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forgot your password?' })).toHaveAttribute('href', '/reset-password');
    const toggle = page.getByRole('button', { name: /show password/i });
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('sign-in block zoom and targets', () => {
  test.use({ viewport: SIZES.desktop });

  test('works at 200 % zoom (640 px wide) without horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 400 });
    await openBlock(page, 'sign-in');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('targets are at least 24 px', async ({ page }) => {
    await openBlock(page, 'sign-in');

    for (const locator of [page.getByRole('button', { name: 'Sign in' }), page.getByRole('checkbox', { name: 'Remember me' })]) {
      const box = await locator.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(24);
      expect(box.width).toBeGreaterThanOrEqual(24);
    }
  });
});

test.describe('empty-app block', () => {
  test.use({ viewport: SIZES.desktop });

  test('one main landmark, one banner, one h1', async ({ page }) => {
    await openBlock(page, 'empty-app');
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('banner')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 2, name: 'No projects yet' })).toBeVisible();
  });

  test('the skip link is the first Tab stop and moves focus to main', async ({ page }) => {
    await openBlock(page, 'empty-app');
    await pressTab(page);
    const skip = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skip).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
  });

  test('the primary action and the secondary link are reachable by keyboard, in that order', async ({ page }) => {
    await openBlock(page, 'empty-app');
    await page.getByRole('button', { name: 'Create a project' }).focus();
    await pressTab(page);
    await expect(page.getByRole('link', { name: 'Import from a spreadsheet' })).toBeFocused();
  });

  test('the primary action announces its sample message', async ({ page }) => {
    await recordAnnouncements(page);
    await openBlock(page, 'empty-app');
    await page.getByRole('button', { name: 'Create a project' }).click();
    await expectAnnounced(page, 'Sample page: connect this button');
  });
});

test("each block's inline no-flash script matches the CSP hash in its comment", () => {
  for (const name of Object.keys(READY)) {
    const html = readFileSync(new URL(`../../../packages/cli/blocks/${name}/index.html`, import.meta.url), 'utf8');
    const script = html.match(/<script>(.*?)<\/script>/s)[1];
    const claimed = html.match(/CSP script-src hash: '?(sha256-[A-Za-z0-9+/=]+)/)[1];
    expect(createHash('sha256').update(script).digest('base64')).toBe(claimed.slice('sha256-'.length));
  }
});
