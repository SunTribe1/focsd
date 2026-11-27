import { expect, test } from '@playwright/test';
import { executeTool as execute } from '../../playground/e2e/fixtures/webmcp.js';

// The docs' agent tools through Chrome's own WebMCP (--enable-features=WebMCPTesting).
// Runs in the chrome-webmcp project; skips when the installed Chrome has no WebMCP.

const NAMES = ['check_markup', 'get_component', 'get_setup', 'get_tokens', 'open_component_page', 'search_components'];

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  test.skip(!(await page.evaluate(() => Boolean(document.modelContext?.executeTool))), 'This Chrome has no WebMCP');
  await page.waitForFunction(async () => (await document.modelContext.getTools()).length >= 6, null, { timeout: 15_000 });
});

test('the browser lists the six docs tools, read-only ones marked', async ({ page }) => {
  const tools = await page.evaluate(async () =>
    (await document.modelContext.getTools()).map((t) => ({ name: t.name, readOnly: t.annotations?.readOnlyHint })),
  );

  expect(tools.map((t) => t.name).toSorted()).toEqual(NAMES);
  expect(tools.find((t) => t.name === 'search_components').readOnly).toBe(true);
  expect(tools.find((t) => t.name === 'open_component_page').readOnly).toBe(false);
});

test('an agent can search, read a reference and check markup through the browser', async ({ page }) => {
  const found = await execute(page, 'search_components', { query: 'draggable card' });
  expect(found.matches[0]).toMatchObject({ tag: 'focsd-floating-panel' });
  const ref = await execute(page, 'get_component', { tag: 'select' });
  expect(ref.markdown).toContain('focsd-select');
  const checked = await execute(page, 'check_markup', { html: '<focsd-text-field></focsd-text-field>' });
  expect(checked.issues[0].code).toBe('missing-label');
});

test('open_component_page navigates', async ({ page }) => {
  await execute(page, 'open_component_page', { tag: 'focsd-date-picker' }).catch(() => {});
  await expect(page).toHaveURL(/\/components\/date-picker\/$/);
});
