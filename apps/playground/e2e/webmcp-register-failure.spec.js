import { expect, test } from './fixtures/test.js';

// When the browser refuses a tool (a name clash with another script, a policy), @focsd-dev/webmcp
// warns once with the reason and carries on: the page's other forms still become tools.

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test('a tool the browser refuses is reported once, and the other tools still register', async ({ page }) => {
  const warnings = [];

  page.on('console', (message) => {
    if (message.type() === 'warning') warnings.push(message.text());
  });

  await page.addInitScript(() => {
    const tools = new Map();
    window.__tools = tools;
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: {
        async registerTool(tool) {
          if (tool.name === 'contact-us') throw new DOMException('Blocked by policy', 'NotAllowedError');
          tools.set(tool.name, tool);
        },
      },
    });
  });

  await page.goto('/webmcp.html');
  await page.waitForFunction(() => window.__tools.has('book-table'));
  await expect.poll(() => warnings.filter((w) => w.includes('could not register the tool "contact-us"'))).toHaveLength(1);

  expect(warnings.find((w) => w.includes('contact-us'))).toBe(
    'Focsd: @focsd-dev/webmcp could not register the tool "contact-us": Blocked by policy',
  );
  expect(await page.evaluate(() => [...window.__tools.keys()])).toEqual(['book-table']);
});
