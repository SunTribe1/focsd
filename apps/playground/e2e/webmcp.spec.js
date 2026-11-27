import { expect, test } from './fixtures/test.js';
import { recordModelContext } from './fixtures/webmcp.js';

// @focsd/webmcp: forms marked with toolname become WebMCP tools whose schema covers Focsd controls.
// A recording document.modelContext stands in for the browser's (Chrome 149+ origin trial / flag).

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test.beforeEach(async ({ page }) => {
  await recordModelContext(page);
  await page.goto('/webmcp.html');
  await page.waitForFunction(() => window.__tools.has('book-table'));
});

const schema = (page, name) => page.evaluate((n) => window.__tools.get(n).inputSchema, name);
const run = (page, name, input) => page.evaluate(([n, i]) => window.__tools.get(n).execute(i), [name, input]);

test('a form with toolname becomes a tool with its name and description', async ({ page }) => {
  const tool = await page.evaluate(() => {
    const t = window.__tools.get('book-table');

    return { name: t.name, description: t.description };
  });

  expect(tool).toEqual({ name: 'book-table', description: 'Book a table at the restaurant.' });
  expect(await page.evaluate(() => [...window.__tools.keys()].toSorted())).toEqual(['book-table', 'contact-us']);
});

test('the schema describes every Focsd control precisely', async ({ page }) => {
  const s = await schema(page, 'book-table');
  const p = s.properties;
  expect(s.type).toBe('object');
  expect(s.required.toSorted()).toEqual(['email', 'guests', 'name']);
  expect(p.name).toMatchObject({ type: 'string', description: 'Name for the booking' });
  expect(p.email).toMatchObject({ type: 'string', format: 'email' });
  expect(p.guests).toMatchObject({ type: 'number', minimum: 1, maximum: 12 });
  expect(p.date).toMatchObject({ type: 'string', format: 'date' });
  expect(p.time.pattern).toBeTruthy();
  expect(p.area.enum).toEqual(['inside', 'bar', 'terrace']);
  expect(p.area.description).toContain('Dining room');
  expect(p.diet).toMatchObject({ type: 'array', maxItems: 2, items: { enum: ['vegan', 'gluten', 'nuts'] } });
  expect(p.seating.enum).toEqual(['booth', 'table']);
  expect(p.highchair.type).toBe('boolean');
  expect(p.reminder.type).toBe('boolean');
  expect(p.budget).toMatchObject({ type: 'array', minItems: 2, maxItems: 2, items: { type: 'number', minimum: 0, maximum: 200 } });
  expect(p.rating).toMatchObject({ type: 'integer', minimum: 1, maximum: 5 });
  expect(p.notes.type).toBe('string');
  // Never exposed to agents: passwords, files, hidden fields.
  expect(p.password).toBeUndefined();
  expect(p.files).toBeUndefined();
  expect(p.source).toBeUndefined();
});

test('executing the tool fills the form like a person would, submits it and returns the page response', async ({ page }) => {
  const result = await run(page, 'book-table', {
    name: 'Ada',
    email: 'ada@example.com',
    guests: 4,
    date: '2026-12-24',
    time: '19:30',
    area: 'terrace',
    diet: ['vegan', 'nuts'],
    seating: 'booth',
    highchair: true,
    reminder: true,
    budget: [40, 120],
    rating: 4,
    notes: 'Window please',
  });

  expect(result).toEqual({ ok: true, message: 'Booked a table for 4 under Ada.' });
  await expect(page.locator('#booked')).toHaveText('Booked a table for 4 under Ada.');

  const data = await page.locator('#book').evaluate((f) => {
    const d = new FormData(f);

    return {
      area: d.get('area'),
      diet: d.getAll('diet'),
      highchair: d.get('highchair'),
      budget: d.getAll('budget'),
      date: d.get('date'),
      time: d.get('time'),
    };
  });

  expect(data).toEqual({
    area: 'terrace',
    diet: ['vegan', 'nuts'],
    highchair: 'on',
    budget: ['40', '120'],
    date: '2026-12-24',
    time: '19:30',
  });
});

test('without toolautosubmit the person confirms: the form is filled and waits for their submit', async ({ page }) => {
  const pending = page.evaluate(() => {
    window.__done = false;

    return window.__tools
      .get('contact-us')
      .execute({ subject: 'Hello' })
      .then((r) => {
        window.__done = true;

        return r;
      });
  });

  await expect(page.locator('#contact')).toHaveAttribute('data-focsd-tool-active', '');
  await expect(page.locator('#contact focsd-text-field')).toHaveJSProperty('value', 'Hello');
  expect(await page.evaluate(() => window.__done)).toBe(false);
  await page.locator('#contact').getByRole('button', { name: 'Send' }).click();
  expect(await pending).toEqual({ sent: true });
  await expect(page.locator('#contact')).not.toHaveAttribute('data-focsd-tool-active', '');
});

test('invalid input is refused with the reason, and nothing is submitted', async ({ page }) => {
  const result = await run(page, 'book-table', { name: 'Ada', email: 'not-an-email', guests: 40 });
  expect(result.ok).toBe(false);
  expect(result.errors.map((e) => e.field).toSorted()).toEqual(['email', 'guests']);
  await expect(page.locator('#booked')).toHaveText('');
});

test('tools follow the page: removing a form or its toolname unregisters it', async ({ page }) => {
  await page.locator('#contact').evaluate((f) => f.removeAttribute('toolname'));
  await expect.poll(() => page.evaluate(() => window.__tools.has('contact-us'))).toBe(false);
  await page.locator('#book').evaluate((f) => f.remove());
  await expect.poll(() => page.evaluate(() => window.__tools.size)).toBe(0);
});

test('defineTool registers an app tool and dispose removes everything', async ({ page }) => {
  const out = await page.evaluate(async () => {
    const { defineTool } = window.__webmcp;

    const stop = await defineTool({
      name: 'get-opening-hours',
      description: 'Opening hours for a day.',
      inputSchema: { type: 'object', properties: { day: { type: 'string' } } },
      execute: ({ day }) => ({ day, hours: '12:00-23:00' }),
    });

    const value = await window.__tools.get('get-opening-hours').execute({ day: 'Monday' });
    stop();

    return [value, window.__tools.has('get-opening-hours')];
  });

  expect(out).toEqual([{ day: 'Monday', hours: '12:00-23:00' }, false]);
  await page.evaluate(() => window.__webmcp.dispose());
  await expect.poll(() => page.evaluate(() => window.__tools.size)).toBe(0);
});

test('without WebMCP in the browser, enabling it is a harmless no-op', async ({ browser }) => {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/webmcp.html');
  await page.waitForFunction(() => window.__webmcp);
  expect(await page.evaluate(() => window.__webmcp.supported)).toBe(false);
  expect(errors).toEqual([]);
  await page.close();
});
