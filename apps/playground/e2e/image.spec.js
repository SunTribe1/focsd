import { expect, test } from './fixtures/test.js';
import { mountInMain as mount, openFromMinorsPolish } from './fixtures/pages.js';

// Re-homed from minors-polish.spec.js (Q48).

test('an image without alt warns once in development', async ({ page }) => {
  await openFromMinorsPolish(page);
  const warnings = [];
  page.on('console', (m) => m.type() === 'warning' && /alt/.test(m.text()) && warnings.push(m.text()));
  await mount(
    page,
    '<focsd-image src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" width="10" height="10"></focsd-image><focsd-image src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></focsd-image><focsd-image src="x.png" alt=""></focsd-image>',
  );
  await expect.poll(() => warnings.length).toBe(1);
});
