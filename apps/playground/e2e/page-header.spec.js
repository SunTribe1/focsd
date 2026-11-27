import { readdirSync, readFileSync } from 'node:fs';
import { expect, test } from './fixtures/test.js';

// Every playground page shares one header (src/base.js defines <pg-header>) and one set of base
// imports, so navigation and the page title never drift between pages.
const ROOT = new URL('..', import.meta.url);

const PAGES = readdirSync(ROOT)
  .filter((f) => f.endsWith('.html'))
  .toSorted();

/** Pages that keep their own head: why each is exempt. */
const EXEMPT = {
  // The page demonstrates focsd-header, which is the page's banner landmark: a second one would fail axe.
  'navigation.html': 'owns the banner landmark',
  // focsd-app-shell fixtures: the slotted focsd-header is the banner, as in an app (e2e/app-shell.spec.js,
  // e2e/table-of-contents.spec.js); a pg-header would be a second banner.
  'app-shell.html': 'the app shell owns the banner landmark',
  'toc-shell.html': 'the app shell owns the banner landmark',
  // Proves the tokens no-flash snippet runs before any module (e2e/presets.spec.js), so it loads none.
  'no-flash.html': 'loads no module, by design',
  // Another agent's work in progress (consistent-inputs.*).
  'consistent-inputs.html': 'not part of this pass',
};

const shared = PAGES.filter((f) => !(f in EXEMPT));

for (const file of shared) {
  test(`${file}: one banner with the page title as the only h1`, async ({ page }) => {
    await page.goto(`/${file}`);
    const banner = page.getByRole('banner');
    await expect(banner).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(banner.getByRole('heading', { level: 1 })).toHaveCount(1);
  });
}

for (const file of shared.filter((f) => f !== 'index.html')) {
  test(`${file}: the banner has a way back to the index`, async ({ page }) => {
    await page.goto(`/${file}`);
    await expect(page.getByRole('banner').getByRole('link', { name: 'Foundation' })).toHaveAttribute('href', '/');
  });
}

for (const file of ['app-shell.html', 'toc-shell.html']) {
  test(`${file}: the app shell's focsd-header is the single banner, and the page has one h1`, async ({ page }) => {
    await page.goto(`/${file}`);
    await expect(page.getByRole('banner')).toHaveCount(1);
    await expect(page.locator('focsd-app-shell > focsd-header[slot="header"]')).toHaveCount(1);
    await expect(page.locator('pg-header')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });
}

test('no-flash.html has one h1 and loads no module', async ({ page }) => {
  await page.goto('/no-flash.html');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  // The source, not the served page: the dev server injects its own client module.
  expect(readFileSync(new URL('no-flash.html', ROOT), 'utf8')).not.toMatch(/<script[^>]*(type="module"|src=)/);
});

test('every exempt page still exists (a stale exemption hides nothing)', () => {
  for (const file of Object.keys(EXEMPT)) expect(PAGES, file).toContain(file);
});

test('navigation.html keeps focsd-header as its single banner', async ({ page }) => {
  await page.goto('/navigation.html');
  await expect(page.getByRole('banner')).toHaveCount(1);
  await expect(page.locator('pg-header')).toHaveCount(0);
});

test('every entry module starts from the shared base', () => {
  for (const file of shared) {
    const entry = /src="\/src\/([^"]+)"/.exec(readFileSync(new URL(file, ROOT), 'utf8'))?.[1];
    const source = readFileSync(new URL(`src/${entry}`, ROOT), 'utf8');

    expect(source, `${entry} imports ./base.js`).toMatch(/^import '\.\/base\.js';$/m);
    expect(source, `${entry} repeats a base import`).not.toMatch(/@focsd-dev\/tokens\/(fonts|tokens)\.css|\.\/playground\.css/);
  }
});

test('pages use classes, not inline styles, for width, rows and sizing', () => {
  for (const file of PAGES.filter((f) => f !== 'consistent-inputs.html')) {
    const html = readFileSync(new URL(file, ROOT), 'utf8');

    expect(html, `${file}: max-inline-size`).not.toMatch(/style="[^"]*max-inline-size/);
    expect(html, `${file}: flex row`).not.toMatch(/style="display: flex/);
    expect(html, `${file}: card height`).not.toMatch(/class="pg-card" style=/);
  }
});
