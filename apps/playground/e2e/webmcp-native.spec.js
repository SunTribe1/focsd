import { expect, test } from './fixtures/test.js';
import { executeTool as execute } from './fixtures/webmcp.js';

// @focsd-dev/webmcp against Chrome's own WebMCP (document.modelContext, --enable-features=WebMCPTesting).
// Runs in the chrome-webmcp project; skips when the installed Chrome has no WebMCP.

test.beforeEach(async ({ page }) => {
  await page.goto('/webmcp.html');
  const native = await page.evaluate(() => Boolean(document.modelContext?.executeTool));
  test.skip(!native, 'This Chrome has no WebMCP');
  await page.waitForFunction(async () => (await document.modelContext.getTools()).length >= 2);
});

/** Chrome's tool list, with parsed schemas. */
const tools = (page) =>
  page.evaluate(async () =>
    (await document.modelContext.getTools()).map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: typeof t.inputSchema === 'string' ? JSON.parse(t.inputSchema) : t.inputSchema,
    })),
  );

test('each form is one browser tool, with the Focsd schema instead of the native one', async ({ page }) => {
  const list = await tools(page);
  expect(list.map((t) => t.name).toSorted()).toEqual(['book-table', 'contact-us']);
  const book = list.find((t) => t.name === 'book-table');
  expect(Object.keys(book.inputSchema.properties)).toEqual(
    expect.arrayContaining(['name', 'guests', 'date', 'area', 'diet', 'seating', 'highchair', 'budget', 'rating']),
  );

  for (const secret of ['password', 'files', 'source']) expect(book.inputSchema.properties).not.toHaveProperty(secret);
  expect(book.inputSchema.properties.diet).toMatchObject({ type: 'array', maxItems: 2 });
  await expect(page.locator('form[toolname]')).toHaveCount(0);
  await expect(page.locator('form[data-focsd-toolname]')).toHaveCount(2);
});

test('an autosubmit tool fills the form, submits it and returns the page answer', async ({ page }) => {
  const result = await execute(page, 'book-table', {
    name: 'Ada',
    email: 'ada@example.com',
    guests: 4,
    date: '2026-12-24',
    area: 'terrace',
    diet: ['vegan'],
    budget: [30, 90],
  });

  expect(result).toMatchObject({ ok: true, message: 'Booked a table for 4 under Ada.' });
  await expect(page.locator('#booked')).toHaveText('Booked a table for 4 under Ada.');
  await expect(page.locator('focsd-select[name=area]')).toHaveJSProperty('value', 'terrace');
});

test('invalid input comes back as errors and leaves the form alone', async ({ page }) => {
  const result = await execute(page, 'book-table', { name: 'Ada', email: 'nope', guests: 40 });
  expect(result.ok).toBe(false);
  expect(result.errors.map((e) => e.field).toSorted()).toEqual(['email', 'guests']);
  await expect(page.locator('focsd-text-field[name=name]')).toHaveJSProperty('value', '');
});

test('without autosubmit the form waits for the person to send it', async ({ page }) => {
  const pending = execute(page, 'contact-us', { subject: 'Hello' });
  await expect(page.locator('focsd-text-field[name=subject]')).toHaveJSProperty('value', 'Hello');
  await expect(page.locator('#contact')).toHaveAttribute('data-focsd-tool-active', '');
  await page.locator('#contact focsd-button[type=submit]').click();
  expect(await pending).toEqual({ sent: true });
  await expect(page.locator('#contact')).not.toHaveAttribute('data-focsd-tool-active', '');
});

test('the browser tool list follows the page: added, changed and removed forms', async ({ page }) => {
  await page.evaluate(() => {
    document
      .querySelector('main')
      .insertAdjacentHTML('beforeend', '<form id="late" toolname="find" tooldescription="Find a dish."><input name="q"></form>');
  });
  await expect.poll(async () => (await tools(page)).map((t) => t.name).toSorted()).toEqual(['book-table', 'contact-us', 'find']);
  await page.evaluate(() => document.getElementById('late').setAttribute('data-focsd-tooldescription', 'Search the menu.'));
  await expect.poll(async () => (await tools(page)).find((t) => t.name === 'find')?.description).toBe('Search the menu.');
  await page.evaluate(() => document.getElementById('late').remove());
  await expect.poll(async () => (await tools(page)).map((t) => t.name).toSorted()).toEqual(['book-table', 'contact-us']);
});

test('dispose removes every tool from the browser', async ({ page }) => {
  await page.evaluate(() => window.__webmcp.dispose());
  await expect.poll(async () => (await tools(page)).length).toBe(0);
});
