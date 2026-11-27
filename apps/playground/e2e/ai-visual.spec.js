import { expect, test } from './fixtures/test.js';
import { addThemeInitScript, expectTheme } from './fixtures/axe.js';

// ai.html in three states, against committed baselines: the thread at rest, a reply that is still
// streaming, and a tool call opened. Messages are set directly on the chat controller, so the
// states do not depend on timers. Update with:
//   pnpm exec playwright test --project=visual ai-visual --update-snapshots

test.use({ contextOptions: { reducedMotion: 'reduce' }, timezoneId: 'UTC', locale: 'en-US' });

const AT = Date.UTC(2026, 2, 15, 10, 0);

const user = { id: 'u1', role: 'user', status: 'done', createdAt: AT, parts: [{ type: 'text', text: 'Show me how the thread streams.' }] };

const answer = {
  id: 'a1',
  role: 'assistant',
  status: 'done',
  createdAt: AT + 60_000,
  parts: [
    { type: 'tool-call', id: 'c1', name: 'search_docs', input: { query: 'feed pattern', limit: 2 }, status: 'done', output: { hits: 2 } },
    { type: 'source', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/feed/', title: 'Feed pattern' },
    {
      type: 'text',
      text: 'The thread is a **feed**. Each reply is announced once, when it is complete.\n\n- One article per message\n- `aria-busy` while it streams',
    },
  ],
};

const streaming = {
  id: 'a2',
  role: 'assistant',
  status: 'streaming',
  createdAt: AT + 120_000,
  parts: [{ type: 'text', text: 'Streaming markdown is **built as it arrives**, so the first lines are already' }],
};

const nothing = async () => {};
const openTool = (page) => page.getByRole('button', { name: 'search_docs, done' }).click();

const STATES = [
  ['idle', [user, answer], nothing],
  ['streaming', [user, answer, { ...user, id: 'u2', createdAt: AT + 100_000 }, streaming], nothing],
  ['tool-open', [user, answer], openTool],
];

for (const theme of ['light', 'dark']) {
  for (const [name, messages, act] of STATES) {
    test(`ai.html (${name}) in the ${theme} theme looks as before`, async ({ page }) => {
      await page.clock.setFixedTime(new Date('2026-03-15T10:00:00Z'));
      await addThemeInitScript(page, theme);
      await page.goto('/ai.html');
      await expectTheme(page, theme);
      await page.waitForFunction(() => window.__ready);
      await page.evaluate((list) => window.__chat.setMessages(list), messages);
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.querySelectorAll('*')].flatMap((el) => (el.updateComplete ? [el.updateComplete] : [])));
      });

      await act(page);

      await expect(page).toHaveScreenshot(`ai-${name}-${theme}.png`, { fullPage: true });
    });
  }
}
