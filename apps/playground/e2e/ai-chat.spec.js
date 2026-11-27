// cspell:ignore msdownload
import { expect, test } from './fixtures/test.js';
import { frames } from './fixtures/pages.js';
import { announcements, expectAnnounced, recordAnnouncements } from './fixtures/announcements.js';
import { pressTab } from './fixtures/keys.js';
import { expectTargetsFollowDensity } from './fixtures/targets.js';

// ai.html: the chat elements wired to the scripted transport (no server, no key). `?delay=N` sets
// the milliseconds between chunks, so the specs stream fast or slowly as they need.

const open = async (page, delay = 4) => {
  await recordAnnouncements(page);
  await page.goto(`/ai.html?delay=${delay}`);
  await page.waitForFunction(() => window.__ready);
};

const textbox = (page) => page.getByRole('textbox', { name: 'Message' });

const say = async (page, text) => {
  await textbox(page).fill(text);
  await textbox(page).press('Enter');
};

const replies = (page) => page.locator('focsd-chat-message[from="assistant"]');

/** The reply is complete: its article is no longer busy. */
const settled = (page, count = 1) =>
  expect
    // The long reply streams for several seconds in Firefox under suite load.
    .poll(() => page.locator('focsd-chat-message[from="assistant"] article:not([aria-busy="true"])').count(), { timeout: 20_000 })
    .toBeGreaterThanOrEqual(count);

const heard = async (page) => (await announcements(page)).filter((a) => a.text.startsWith('Assistant replied:'));

test('one polite announcement per completed message, never per token', async ({ page }) => {
  await open(page, 12);
  await say(page, 'Explain streaming markdown');

  await expect(page.locator('article[aria-busy="true"]')).toHaveCount(1);
  // While the reply streams, nothing is announced: no token, no sentence.
  let early = [];

  await expect
    .poll(async () => {
      const busy = await page.locator('article[aria-busy="true"]').count();

      if (busy) early = [...early, ...(await announcements(page))];

      return busy;
    })
    .toBe(0);
  expect(early).toEqual([]);

  await expectAnnounced(page, 'Assistant replied:');
  await frames(page, 30);

  const first = await heard(page);

  expect(first).toHaveLength(1);
  expect(first[0].politeness).toBe('polite');
  expect(first[0].text).toContain('Streaming markdown is built as it arrives');

  await say(page, 'Show a tool call');
  await settled(page, 2);
  await expect.poll(async () => (await heard(page)).length).toBe(2);
  await frames(page, 30);
  expect(await heard(page)).toHaveLength(2);
  // The person's own messages are never announced.
  expect((await announcements(page)).filter((a) => a.text.includes('Show a tool call'))).toEqual([]);
});

test('aria-busy is on while the reply streams and off after', async ({ page }) => {
  await open(page, 12);
  await say(page, 'Write a long answer');

  const article = replies(page).locator('article');

  await expect(article).toHaveAttribute('aria-busy', 'true');
  await settled(page);
  await expect(article).not.toHaveAttribute('aria-busy', 'true');
  // The feed names the thread and numbers its articles.
  await expect(page.getByRole('feed', { name: 'Conversation' })).toBeVisible();
  await expect(page.getByRole('article').first()).toHaveAttribute('aria-posinset', '1');
});

test('Ctrl+End and Ctrl+Home leave the feed for the next and previous elements (APG feed)', async ({ page }) => {
  await open(page);
  await say(page, 'Hello');
  await settled(page);

  /** Where focus is: the document's active element and, inside it, its shadow root's. */
  const focused = () =>
    page.evaluate(() => [document.activeElement?.tagName, document.activeElement?.shadowRoot?.activeElement?.tagName].join(' '));

  await page.getByRole('article').last().focus();
  await page.keyboard.press('Control+End');
  // The next stop after the thread: the first suggested prompt.
  expect(await focused()).toBe('FOCSD-PROMPT-SUGGESTIONS BUTTON');

  await page.getByRole('article').last().focus();
  await page.keyboard.press('Control+Home');
  // The stop before it: the playground header's back link.
  expect(await focused()).toBe('FOCSD-LINK A');
});

test('Stop is reached by Tab from the field, and announces "Response stopped"', async ({ page }) => {
  await open(page, 40);
  await say(page, 'Write a long answer');
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();

  // Focus stays in the field after Enter; the next Tab stop is Stop (no Escape needed).
  await expect(textbox(page)).toBeFocused();
  await pressTab(page);
  await expect(page.getByRole('button', { name: 'Stop' })).toBeFocused();
  await page.keyboard.press('Enter');

  await expectAnnounced(page, 'Response stopped');
  await expect(page.locator('focsd-chat-message article[aria-busy="true"]')).toHaveCount(0);
  // The button is Send again, in the same place, and keeps focus.
  await expect(page.getByRole('button', { name: 'Send' })).toBeFocused();
  expect(await heard(page)).toHaveLength(0);
});

test('an Enter that belongs to an IME composition never sends', async ({ page }) => {
  await open(page);
  await textbox(page).fill('こんにちは');
  await textbox(page).evaluate((el) => {
    el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, composed: true }));

    for (const init of [{ isComposing: true }, { isComposing: false, keyCode: 229 }]) {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true, cancelable: true, ...init }));
    }
  });

  await frames(page, 10);
  await expect(page.locator('focsd-chat-message')).toHaveCount(0);
  await expect(textbox(page)).toHaveValue('こんにちは');

  await textbox(page).evaluate((el) => el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, composed: true })));
  await textbox(page).press('Enter');
  await expect(page.locator('focsd-chat-message[from="user"]')).toHaveCount(1);
});

test('Shift+Enter adds a line and does not send', async ({ page }) => {
  await open(page);
  await textbox(page).fill('one');
  await textbox(page).press('Shift+Enter');
  await textbox(page).pressSequentially('two');
  await expect(page.locator('focsd-chat-message')).toHaveCount(0);
  await expect(textbox(page)).toHaveValue('one\ntwo');
});

const paste = (page, name, type) =>
  textbox(page).evaluate(
    (el, [fileName, mediaType]) => {
      const data = new DataTransfer();

      data.items.add(new File(['hello'], fileName, { type: mediaType }));
      const event = new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true, composed: true });

      // Firefox gives a constructed ClipboardEvent an empty clipboardData; attach ours so the test drives the real handler.
      Object.defineProperty(event, 'clipboardData', { value: data });
      el.dispatchEvent(event);
    },
    [name, type],
  );

test('a pasted file adds a tile, and a rejected type is announced', async ({ page }) => {
  await open(page);
  await paste(page, 'notes.txt', 'text/plain');

  const tile = page.getByRole('listitem').filter({ hasText: 'notes.txt' });

  await expect(tile).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove notes.txt' })).toBeVisible();

  await paste(page, 'setup.exe', 'application/x-msdownload');
  await expectAnnounced(page, 'setup.exe was not attached: this file type is not accepted', 'assertive');
  // The rejection is also on screen, tied to the field, and no tile was added.
  await expect(page.locator('focsd-composer [part="error"]')).toHaveText('setup.exe was not attached: this file type is not accepted');
  await expect(page.getByRole('listitem').filter({ hasText: 'setup.exe' })).toHaveCount(0);

  // Sending takes the file with the text.
  await say(page, 'See the file');
  await expect(page.locator('focsd-chat-message[from="user"]')).toContainText('notes.txt');
  await expect(page.getByRole('button', { name: 'Remove notes.txt' })).toHaveCount(0);
});

test('send, stop and attach follow the density (44 px at comfortable)', async ({ page }) => {
  await open(page, 40);
  await expectTargetsFollowDensity(page, [page.getByRole('button', { name: 'Send' }), page.getByRole('button', { name: 'Attach files' })]);
  await say(page, 'Write a long answer');
  await expectTargetsFollowDensity(page, [page.getByRole('button', { name: 'Stop' })]);
});

const feed = (page) => page.locator('#thread').evaluateHandle((el) => el.shadowRoot.querySelector('[part~="feed"]'));
const scrollTop = async (page) => (await feed(page)).evaluate((el) => el.scrollTop);

test('auto-scroll stops when the reader scrolls up', async ({ page }) => {
  await open(page, 14);
  await say(page, 'Write a long answer');

  // While at the bottom the thread follows the reply.
  await expect.poll(async () => (await feed(page)).evaluate((el) => el.scrollHeight > el.clientHeight + 100)).toBe(true);
  await expect.poll(async () => (await feed(page)).evaluate((el) => el.scrollHeight - el.clientHeight - el.scrollTop)).toBeLessThan(40);

  // The reader scrolls up: the thread stays where they are, and offers "Jump to latest".
  const box = await page.locator('#thread').boundingBox();

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -500);
  await expect(page.getByRole('button', { name: 'Jump to latest' })).toBeVisible();

  const stayed = await scrollTop(page);

  await frames(page, 40);
  expect(await scrollTop(page)).toBeLessThanOrEqual(stayed + 2);

  await page.getByRole('button', { name: 'Jump to latest' }).click();
  await expect.poll(async () => (await feed(page)).evaluate((el) => el.scrollHeight - el.clientHeight - el.scrollTop)).toBeLessThan(40);
  await settled(page);
});

test('a failed reply shows the translated error and announces it assertively', async ({ page }) => {
  await open(page);
  await say(page, 'Trigger an error');

  await expectAnnounced(page, 'The server returned an error: Service Unavailable.', 'assertive');
  await expect(replies(page).locator('.error')).toHaveText('The server returned an error: Service Unavailable.');
});

test('the message actions are one toolbar tab stop that moves with the arrow keys', async ({ page }) => {
  await open(page);
  await say(page, 'Explain streaming markdown');
  await settled(page);

  const toolbar = page.getByRole('toolbar', { name: 'Message actions' });
  const copy = toolbar.getByRole('button', { name: 'Copy', exact: true });
  const retry = toolbar.getByRole('button', { name: 'Retry' });

  await copy.focus();
  await page.keyboard.press('ArrowRight');
  await expect(retry).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(copy).toBeFocused();
  await page.keyboard.press('End');
  await expect(toolbar.getByRole('button', { name: 'Bad response' })).toBeFocused();
  // Only the active control is a tab stop; the copy button's host takes -1 through its own attribute.
  await expect(toolbar.locator('focsd-copy-button')).toHaveAttribute('tabindex', '-1');
  // Tab leaves the toolbar in one press: the delegated-focus copy host is not a second stop.
  await copy.focus();
  await page.keyboard.press('Tab');
  expect(await toolbar.evaluate((el) => el.matches(':focus-within'))).toBe(false);
});

test('the suggestions send a message, and a tool call opens as a disclosure', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Show a tool call' }).click();
  await settled(page);

  const tool = page.getByRole('button', { name: 'search_docs, done' });

  await expect(tool).toHaveAttribute('aria-expanded', 'false');
  await tool.click();
  await expect(tool).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('"query": "server-sent events"')).toBeVisible();
  await expect(page.getByRole('link', { name: /Server-sent events/ }).first()).toHaveAttribute('rel', /noopener/);
});

test('markdown from the reply is built as DOM: lists, code and a safe link, script text stays text', async ({ page }) => {
  await open(page);
  await say(page, 'Explain streaming markdown');
  await settled(page);

  const reply = replies(page).first();

  await expect(reply.getByRole('listitem')).toHaveCount(3);
  await expect(reply.locator('pre code')).toContainText('createChat({ transport })');
  await expect(reply.getByRole('link', { name: 'A link' })).toHaveAttribute('href', 'https://focsd.dev');
  await expect(reply).toContainText('<script>alert(1)</script>');
  expect(await reply.evaluate((el) => el.shadowRoot.querySelectorAll('script').length)).toBe(0);
});

test('a history set at once is shown and not announced', async ({ page }) => {
  await open(page);
  await page.evaluate(() =>
    window.__chat.setMessages([
      { id: 'u1', role: 'user', status: 'done', createdAt: 0, parts: [{ type: 'text', text: 'Earlier question' }] },
      { id: 'a1', role: 'assistant', status: 'done', createdAt: 1, parts: [{ type: 'text', text: 'Earlier **answer**' }] },
    ]),
  );

  await expect(page.getByRole('article')).toHaveCount(2);
  await expect(page.getByRole('article').nth(1)).toContainText('Earlier answer');
  await frames(page, 20);
  expect(await announcements(page)).toEqual([]);
});

test('a message written on two lines keeps its line break', async ({ page }) => {
  await open(page);
  await textbox(page).fill('line one');
  await textbox(page).press('Shift+Enter');
  await textbox(page).pressSequentially('line two');
  await textbox(page).press('Enter');

  const mine = page.locator('focsd-chat-message[from="user"] focsd-streaming-text').first();

  await expect(mine).toBeVisible();
  expect(await mine.evaluate((el) => el.shadowRoot.querySelector('[part="text"]').innerText)).toBe('line one\nline two');
});

test('a long tool output is a scroll region reached by keyboard; short blocks add no tab stop', async ({ page }) => {
  await open(page);
  await say(page, 'Show a long tool output');
  await settled(page);

  const tool = page.getByRole('button', { name: 'list_files, done' });

  await tool.click();

  const output = page.getByRole('region', { name: 'Output' });

  // The short input fits, so it is plain text: Tab goes from the tool straight to the long output.
  await expect(page.getByRole('region', { name: 'Input' })).toHaveCount(0);
  await tool.focus();
  await page.keyboard.press('Tab');
  await expect(output).toBeFocused();
  // The focus ring shows (a box-shadow from the focus-ring token).
  expect(await output.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe('none');

  const before = await output.evaluate((el) => el.scrollTop);

  await page.keyboard.press('PageDown');
  await expect.poll(() => output.evaluate((el) => el.scrollTop)).toBeGreaterThan(before);

  await say(page, 'Explain streaming markdown');
  await settled(page, 2);

  // A short code block fits: no region, no tab stop.
  const code = replies(page).nth(1).locator('pre[part~="code"]').first();

  await expect(code).not.toHaveAttribute('tabindex');
  await expect(code).not.toHaveAttribute('role');
});
