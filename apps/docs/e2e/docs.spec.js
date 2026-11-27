import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { components } from '../src/data/catalogue.js';
import { examples } from '../src/data/examples/index.js';

// Scan the settled state: transitions would let axe sample colors mid-animation. Motion is tested in wave8.spec.js.
test.use({ contextOptions: { reducedMotion: 'reduce' } });

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

export const GUIDES = [
  '/getting-started/installation/',
  '/getting-started/usage/',
  '/getting-started/frameworks/',
  '/getting-started/forms/',
  '/getting-started/ai-assistants/',
  '/guides/agent-ready-sites/',
  '/guides/chat-ui/',
  '/guides/charts/',
  '/guides/blocks/',
  '/guides/patterns/',
  '/guides/troubleshooting/',
  '/foundations/design-language/',
  '/foundations/theming/',
  '/foundations/accessibility/',
  '/guides/choosing-a-select/',
  '/guides/choosing-a-toggle/',
  '/guides/screen-reader-testing/',
  '/components/',
];

const axe = async (page) => {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();

  return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
};

const trackErrors = (page) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  return errors;
};

// The landing page has its own spec (landing.spec.js); this keeps it in the site-wide axe sweep.
test('landing page introduces the library with live components', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('Bring every user into focus.');
  await expect(page.getByRole('link', { name: /get started/i }).first()).toBeVisible();
  await page.waitForFunction(() => customElements.get('focsd-button'));
  await expect(page.locator('main focsd-button').first()).toBeVisible();
  expect(await axe(page)).toEqual([]);
  expect(errors).toEqual([]);
});

for (const path of GUIDES) {
  test(`guide ${path} renders with a heading and no accessibility violations`, async ({ page }) => {
    const errors = trackErrors(page);
    const response = await page.goto(path);
    expect(response.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await axe(page)).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('the components index links to every component page', async ({ page }) => {
  await page.goto('/components/');

  for (const c of components) await expect(page.locator(`.sl-markdown-content a[href="/components/${c.slug}/"]`)).toHaveCount(1);
});

/** Where a component page's first example renders: in its iframe (`frame: true`) or inline. */
const framedExample = (page) => page.frameLocator('[data-example] iframe');
const inlineExample = (page) => page.locator('[data-example]').first();

for (const c of components) {
  const exampleRoot = examples[c.slug]?.frame ? framedExample : inlineExample;

  test(`component page: ${c.name} (${c.tag})`, async ({ page }) => {
    const errors = trackErrors(page);
    const response = await page.goto(`/components/${c.slug}/`);
    expect(response.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(c.name);
    await page.waitForFunction((tag) => customElements.get(tag), c.tag);
    await expect(exampleRoot(page).locator(c.tag).first()).toBeAttached();
    await expect(page.getByRole('heading', { name: 'API', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Accessibility', exact: true })).toBeVisible();
    expect(await axe(page)).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('dark theme is mirrored to the components and stays accessible', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/components/button/');
  await expect(page.locator('html')).toHaveAttribute('data-focsd-theme', 'dark');
  expect(await axe(page)).toEqual([]);
  await page.goto('/components/data-grid/');
  expect(await axe(page)).toEqual([]);
});

test('search index is built', async ({ request }) => {
  const response = await request.get('/pagefind/pagefind.js');
  expect(response.status()).toBe(200);
});

test('every sidebar link resolves', async ({ page, request }) => {
  await page.goto('/getting-started/installation/');

  const hrefs = await page
    .locator('nav[aria-label="Main"] a[href^="/"]')
    .evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute('href')))]);

  expect(hrefs.length).toBeGreaterThan(80);

  for (const href of hrefs) expect((await request.get(href)).status(), href).toBe(200);
});

test('sandbox buttons appear exactly when the packages are published', async ({ page }) => {
  // 0.0.0 until the first release; after `changeset version` the default build shows them.
  const { version } = JSON.parse(readFileSync(new URL('../../../packages/components/package.json', import.meta.url), 'utf8'));
  await page.goto('/components/select/');
  await expect(page.getByRole('button', { name: /^Open in (CodePen|StackBlitz)/ })).toHaveCount(version === '0.0.0' ? 0 : 2);
});

// docs.css hides Starlight's "On this page" column until its sibling content exists. It selects
// Starlight's own `.lg:sl-flex`, `.main-pane` and `.right-sidebar-container` classes: if a Starlight
// or theme upgrade renames one, the rule silently stops matching and the page shifts again.
test('the right-sidebar stability rule still matches Starlight markup', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/components/button/');
  await expect(page.locator('.lg\\:sl-flex > .main-pane')).toHaveCount(1);
  await expect(page.locator('.lg\\:sl-flex > .right-sidebar-container')).toHaveCount(1);
});
