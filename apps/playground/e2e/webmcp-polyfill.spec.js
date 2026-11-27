import { readFileSync } from 'node:fs';
import { expect, test } from './fixtures/test.js';

// Against Chrome's own WebMCP polyfill (GoogleChromeLabs/webmcp-tools, Apache-2.0), which also builds
// declarative tools from form[toolname] — but only from native inputs. Focsd's registration must win,
// once, with the full schema.

const polyfill = readFileSync(new URL('./fixtures/webmcp-polyfill.js', import.meta.url), 'utf8');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(polyfill);
  await page.goto('/webmcp.html');
  await page.waitForFunction(async () => (await document.modelContext.getTools()).some((t) => t.name === 'book-table'));
});

test('each form is one tool, with the schema for Focsd controls', async ({ page }) => {
  const tools = await page.evaluate(async () =>
    (await document.modelContext.getTools()).map((t) => ({ name: t.name, keys: Object.keys(t.inputSchema?.properties ?? {}) })),
  );

  expect(tools.filter((t) => t.name === 'book-table')).toHaveLength(1);
  const book = tools.find((t) => t.name === 'book-table');
  expect(book.keys).toEqual(expect.arrayContaining(['name', 'guests', 'area', 'diet', 'budget', 'rating']));
  await expect(page.locator('#book')).toHaveAttribute('data-focsd-toolname', 'book-table');
});

test('an agent call through executeTool books the table', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const tool = (await document.modelContext.getTools()).find((t) => t.name === 'book-table');

    return document.modelContext.executeTool(tool, { name: 'Lin', email: 'lin@example.com', guests: 2, area: 'bar' });
  });

  expect(JSON.stringify(result)).toContain('Booked a table for 2 under Lin.');
  await expect(page.locator('#booked')).toHaveText('Booked a table for 2 under Lin.');
});
