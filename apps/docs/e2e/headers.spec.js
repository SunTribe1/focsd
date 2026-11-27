import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, test } from '@playwright/test';

// Production serves public/_headers (Cloudflare Pages). Apply its Content-Security-Policy here and
// make sure nothing on the site breaks it: inline theme scripts, examples, framed examples, WebMCP.

const headers = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
const csp = headers.match(/Content-Security-Policy: (.+)/)[1].replace('; upgrade-insecure-requests', '');

/** The local preview server sometimes resets a connection under load: fetch once more before failing. */
const fetchWithRetry = async (route) => {
  try {
    return await route.fetch();
  } catch {
    return route.fetch();
  }
};

test.beforeEach(async ({ page }) => {
  await page.route('**/*', async (route) => {
    let response;

    try {
      response = await fetchWithRetry(route);
    } catch {
      // The page navigated away (or the test ended) while this request was in flight: drop it.
      await route.abort().catch(() => {});

      return;
    }

    // Cloudflare applies /* headers to every response: scripts, workers and WASM included.
    await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': csp } }).catch(() => {});
  });
});

/** Open a page, once more if a reset or an aborted request stops the first try (not a CSP problem). */
const gotoWithRetry = async (page, path) => {
  try {
    await page.goto(path);
  } catch {
    await page.goto(path);
  }

  await page.waitForLoadState('load');
};

for (const path of [
  '/',
  '/components/button/',
  '/components/data-grid/',
  '/components/rich-text/',
  '/components/chart/',
  '/components/header/',
  '/foundations/theme-builder/',
  '/foundations/icons/',
]) {
  test(`no CSP violations on ${path}`, async ({ page }) => {
    const violations = [];
    page.on('console', (m) => /Content Security Policy|Refused to/.test(m.text()) && violations.push(m.text()));
    await page.addInitScript(() => {
      window.__csp = [];
      document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
    });
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect([...violations, ...(await page.evaluate(() => window.__csp))]).toEqual([]);
  });
}

test('site search works under the production CSP', async ({ page }) => {
  const violations = [];
  page.on('console', (m) => /Content Security Policy|Refused to|CompileError/.test(m.text()) && violations.push(m.text()));
  await page.goto('/');
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('dialog', { name: 'Search' }).getByRole('textbox', { name: 'Search' }).fill('select');
  await expect(page.locator('.pagefind-ui__result').first()).toBeVisible({ timeout: 15_000 });
  expect(violations).toEqual([]);
});

test('robots.txt points at the sitemap, and the sitemap exists', async ({ request }) => {
  expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap: https://focsd.dev/sitemap-index.xml');
  expect((await request.get('/sitemap-index.xml')).ok()).toBe(true);
});

test('pages carry the social card', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://focsd.dev/og.png');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://focsd.dev/');
});

test('form-action allows only the site and the two example sandboxes', () => {
  const directive = csp
    .split(';')
    .map((d) => d.trim())
    .find((d) => d.startsWith('form-action'));

  expect(directive).toBe("form-action 'self' https://codepen.io https://stackblitz.com");
});

test('an injected inline script is blocked; the page own inline scripts still run', async ({ page }) => {
  await page.goto('/components/select/');

  const ran = await page.evaluate(async () => {
    window.__injected = false;
    const violations = [];
    document.addEventListener('securitypolicyviolation', (e) => violations.push(e.violatedDirective));
    const reported = new Promise((r) => document.addEventListener('securitypolicyviolation', r, { once: true }));
    const s = document.createElement('script');
    s.textContent = 'window.__injected = true';
    document.head.append(s);
    await reported;

    return { injected: window.__injected, violations };
  });

  expect(ran.injected).toBe(false);
  expect(ran.violations.some((d) => d.startsWith('script-src'))).toBe(true);
  // The page's own inline scripts (theme, example runner) ran: the example is interactive.
  await expect(page.locator('focsd-select').first()).toHaveJSProperty('localName', 'focsd-select');
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBeTruthy();
});

/** Every built page, from dist/. Read once at load so the sweep can be split into batches. */
const SITE_ROOT = new URL('../dist/', import.meta.url).pathname;

const walk = (dir) =>
  readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : n === 'index.html' ? [join(dir, n)] : []));

/** A redirect stub (`<meta http-equiv="refresh">`, from Astro `redirects`): it navigates away on load and has no content. */
const isRedirect = (file) => /http-equiv="refresh"/.test(readFileSync(file, 'utf8'));

const SITE_PATHS = existsSync(SITE_ROOT)
  ? walk(SITE_ROOT)
      .filter((f) => !isRedirect(f))
      .map((f) => `/${relative(SITE_ROOT, f).replace(/index\.html$/, '')}`)
  : [];

const BATCHES = 4;

test('the site has enough pages to sweep', () => {
  expect(SITE_PATHS.length).toBeGreaterThan(100);
});

// Four batches, so each stays well inside its timeout and they can run on parallel workers.
for (let batch = 0; batch < BATCHES; batch += 1) {
  test(`no CSP violations on any page of the site (batch ${batch + 1} of ${BATCHES})`, async ({ page }) => {
    test.setTimeout(300_000);
    await page.addInitScript(() => {
      window.__csp = [];
      document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI} ${e.sample}`));
    });
    const problems = [];

    for (const path of SITE_PATHS.filter((_, i) => i % BATCHES === batch)) {
      await gotoWithRetry(page, path);

      for (const v of await page.evaluate(() => window.__csp)) problems.push(`${path}: ${v}`);
    }

    expect(problems).toEqual([]);
  });
}

test('agent resource discovery manifests are valid JSON with entries', async ({ request }) => {
  for (const path of ['/.well-known/ard.json', '/.well-known/ai-catalog.json']) {
    const res = await request.get(path);
    expect(res.ok(), path).toBe(true);
    const body = await res.json();
    expect(body.specVersion).toBe('1.0');
    expect(Array.isArray(body.entries)).toBe(true);

    for (const entry of body.entries) {
      expect(entry.identifier).toMatch(/^urn:air:focsd\.dev:/);
      expect(entry.displayName).toBeTruthy();
      expect(entry.type).toMatch(/\//);
      expect(Boolean(entry.url) !== Boolean(entry.data)).toBe(true);
    }
  }
});
