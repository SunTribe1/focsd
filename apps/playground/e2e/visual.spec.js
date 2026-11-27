import { readdirSync } from 'node:fs';
import { expect, test } from './fixtures/test.js';
import { renderComplete } from './fixtures/pages.js';
import { addThemeInitScript, expectTheme } from './fixtures/axe.js';

// Every playground page in each theme, compared with the committed screenshot for this operating
// system (e2e/__screenshots__/<platform>/). Update after an intended visual change with:
//   pnpm exec playwright test --project=visual --update-snapshots
// ai.html streams on a timer: ai-visual.spec.js covers its states instead.
// Linux baselines (used by CI) come from the "Update visual baselines" workflow.

const PAGES = readdirSync(new URL('..', import.meta.url))
  .filter((f) => f.endsWith('.html') && !['ssr.html', 'ai.html'].includes(f))
  .toSorted();

test.use({ contextOptions: { reducedMotion: 'reduce' } });

for (const file of PAGES) {
  for (const theme of ['light', 'dark', 'contrast']) {
    test(`${file} in the ${theme} theme looks as before`, async ({ page }) => {
      // Fixed date, so calendars, date pickers and "today" render the same every run.
      await page.clock.setFixedTime(new Date('2026-03-15T10:00:00Z'));
      await addThemeInitScript(page, theme);
      await page.goto(`/${file}`);
      await expectTheme(page, theme);
      await renderComplete(page);
      await expect(page).toHaveScreenshot(`${file.replace('.html', '')}-${theme}.png`, { fullPage: true });
    });
  }
}
