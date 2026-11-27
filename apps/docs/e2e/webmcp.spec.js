import { readFileSync, readdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// The docs site offers its own WebMCP tools, so agents in the browser can find components here.

const recorder = () => {
  const tools = new Map();
  window.__tools = tools;
  Object.defineProperty(document, 'modelContext', {
    configurable: true,
    value: {
      async registerTool(tool, { signal } = {}) {
        tools.set(tool.name, tool);
        signal?.addEventListener('abort', () => tools.delete(tool.name));
      },
    },
  });
};

test('docs pages register search, reference, setup, token and markup tools', async ({ page }) => {
  await page.addInitScript(recorder);
  await page.goto('/');
  await page.waitForFunction(() => window.__tools.size >= 6, null, { timeout: 15_000 });
  const names = await page.evaluate(() => [...window.__tools.keys()].toSorted());
  expect(names).toEqual(['check_markup', 'get_component', 'get_setup', 'get_tokens', 'open_component_page', 'search_components']);
  const found = await page.evaluate(() => window.__tools.get('search_components').execute({ query: 'draggable card' }));
  expect(found.matches[0]).toMatchObject({ tag: 'focsd-floating-panel', url: '/components/floating-panel/' });
  const ref = await page.evaluate(() => window.__tools.get('get_component').execute({ tag: 'select' }));
  expect(ref.markdown).toContain('focsd-select');
  const issues = await page.evaluate(() => window.__tools.get('check_markup').execute({ html: '<focsd-text-field></focsd-text-field>' }));
  expect(issues.issues[0].code).toBe('missing-label');
});

test('open_component_page takes the person to the component page', async ({ page }) => {
  await page.addInitScript(recorder);
  await page.goto('/');
  await page.waitForFunction(() => window.__tools?.has('open_component_page'), null, { timeout: 15_000 });
  await page.evaluate(() => window.__tools.get('open_component_page').execute({ tag: 'focsd-date-picker' }));
  await expect(page).toHaveURL(/\/components\/date-picker\/$/);
});

test('without WebMCP no tool code is loaded', async ({ page }) => {
  // The built chunks that hold the catalogue core, its data and the WebMCP helper.
  const dir = new URL('../dist/_astro/', import.meta.url);

  const lazy = readdirSync(dir).filter(
    (f) =>
      f.endsWith('.js') &&
      !f.startsWith('AgentTools') &&
      /createCatalog|registerTool|"components":\[/.test(readFileSync(new URL(f, dir), 'utf8')),
  );

  expect(lazy.length).toBeGreaterThan(0);
  const requested = [];
  page.on('request', (r) => lazy.some((f) => r.url().endsWith(`/_astro/${f}`)) && requested.push(r.url()));
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(requested).toEqual([]);
});

test('llms.txt lists the docs and every component for AI tools', async ({ request }) => {
  const index = await (await request.get('/llms.txt')).text();
  expect(index).toMatch(/^# Focsd/);
  expect(index).toContain('/components/button/');
  const full = await (await request.get('/llms-full.txt')).text();
  expect(full).toContain('# Floating panel (`<focsd-floating-panel>`)');
});
