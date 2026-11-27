// @vitest-environment happy-dom
// focsd-chat-thread: an APG feed of messages driven by a chat controller. One announcement per
// finished reply, Page Up/Down between articles, auto-scroll only while the reader is at the bottom.
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createChat, scriptedTransport } from '../src/chat/index.js';
import '../src/chat-thread.js';

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (/** @type {() => void} */ fn) => setTimeout(fn, 0));
  vi.stubGlobal('cancelAnimationFrame', (/** @type {number} */ id) => clearTimeout(id));
});

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));

/** @param {Partial<import('../src/chat/types.js').Message>} m */
const msg = (m) => ({ id: 'm', role: 'assistant', status: 'done', parts: [], createdAt: 0, ...m });

/** @param {Record<string, unknown>} props */
async function thread(props = {}) {
  const el = Object.assign(document.createElement('focsd-chat-thread'), props);
  document.body.append(el);
  await el.updateComplete;

  return el;
}

const feed = (/** @type {HTMLElement} */ el) => el.shadowRoot.querySelector('[part="feed"]');
const items = (/** @type {HTMLElement} */ el) => [...el.shadowRoot.querySelectorAll('focsd-chat-message')];
const articleOf = (/** @type {HTMLElement} */ m) => m.shadowRoot.querySelector('article');
const jump = (/** @type {HTMLElement} */ el) => el.shadowRoot.querySelector('[part="jump"]');

/** Records what the shared announcer says (each write to a region), in order. */
function recordAnnouncements() {
  /** @type {{ text: string, politeness: string }[]} */
  const said = [];

  const observer = new MutationObserver((records) => {
    for (const r of records) {
      const node = /** @type {Element} */ (r.target.nodeType === 1 ? r.target : r.target.parentNode);
      const region = node.closest('[data-focsd-announcer]');
      const text = region?.textContent;

      if (text) said.push({ text, politeness: region.getAttribute('data-focsd-announcer') });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  return said;
}

/** Lays the feed out as a scroll box: `height` tall, holding `content` px. */
function layout(/** @type {HTMLElement} */ el, { content: initial = 1000, height = 200 } = {}) {
  const box = feed(el);
  let content = initial;
  let top = 0;

  Object.defineProperty(box, 'scrollHeight', { configurable: true, get: () => content });
  Object.defineProperty(box, 'clientHeight', { configurable: true, get: () => height });
  Object.defineProperty(box, 'scrollTop', {
    configurable: true,
    get: () => top,
    set: (v) => {
      top = Math.max(0, Math.min(v, content - height));
    },
  });

  return {
    grow: (/** @type {number} */ by) => (content += by),
    get top() {
      return top;
    },
    scrollTo(/** @type {number} */ v) {
      box.scrollTop = v;
      box.dispatchEvent(new Event('scroll'));
    },
  };
}

it('is a named group until it holds a message, then a feed (an empty feed fails axe)', async () => {
  const el = await thread({ messages: [] });

  expect(feed(el).getAttribute('role')).toBe('group');
  expect(feed(el).getAttribute('aria-label')).toBe('Conversation');

  el.messages = [msg({ id: 'a' })];
  await el.updateComplete;

  expect(feed(el).getAttribute('role')).toBe('feed');
});

it('is a feed named "Conversation" (or label), with articles in position', async () => {
  const el = await thread({ messages: [msg({ id: 'a', role: 'user' }), msg({ id: 'b' })] });

  expect(feed(el).getAttribute('role')).toBe('feed');
  expect(feed(el).getAttribute('aria-label')).toBe('Conversation');
  expect(items(el).map((m) => [m.message.id, m.posinset, m.setsize])).toEqual([
    ['a', 1, 2],
    ['b', 2, 2],
  ]);

  el.label = 'Support chat';
  await el.updateComplete;
  expect(feed(el).getAttribute('aria-label')).toBe('Support chat');
});

it('follows a chat controller, and stops when the chat is replaced or the thread removed', async () => {
  const chat = createChat({ transport: scriptedTransport([[{ type: 'text-delta', id: 't', delta: 'Hello' }]], { delay: 0 }) });
  const el = await thread({ chat });

  await chat.send('Hi');
  await tick();
  await el.updateComplete;

  expect(items(el).map((m) => m.message.role)).toEqual(['user', 'assistant']);
  expect(items(el)[1].message.parts[0].text).toBe('Hello');

  el.remove();
  chat.setMessages([]);
  expect(el.messages).toHaveLength(2);
});

it('retry from a message asks the chat again; actions events reach the page', async () => {
  const chat = createChat({ transport: scriptedTransport([], { delay: 0 }), messages: [msg({ id: 'u', role: 'user' }), msg({ id: 'r' })] });
  const retry = vi.spyOn(chat, 'retry');
  const el = await thread({ chat });

  const onRetry = vi.fn();
  const onFeedback = vi.fn();

  document.body.addEventListener('focsd-retry', onRetry);
  document.body.addEventListener('focsd-feedback', onFeedback);
  await items(el)[1].updateComplete;

  const actions = items(el)[1].shadowRoot.querySelector('focsd-message-actions');

  await actions.updateComplete;
  actions.shadowRoot.querySelector('button[aria-label="Retry"]').click();
  actions.shadowRoot.querySelector('button[aria-label="Good response"]').click();

  expect(retry).toHaveBeenCalledWith('r');
  expect(onRetry.mock.calls[0][0].detail).toEqual({ id: 'r' });
  expect(onFeedback.mock.calls[0][0].detail).toEqual({ id: 'r', value: 'up' });
  document.body.removeEventListener('focsd-retry', onRetry);
  document.body.removeEventListener('focsd-feedback', onFeedback);
});

it('a page that cancels focsd-retry handles it itself', async () => {
  const chat = createChat({ transport: scriptedTransport([], { delay: 0 }), messages: [msg({ id: 'r' })] });
  const retry = vi.spyOn(chat, 'retry');
  const el = await thread({ chat });

  el.addEventListener('focsd-retry', (e) => e.preventDefault());
  items(el)[0].dispatchEvent(new CustomEvent('focsd-retry', { bubbles: true, cancelable: true, detail: { id: 'r' } }));

  expect(retry).not.toHaveBeenCalled();
});

it('announces a finished reply once, never per token, capped at 300 characters', async () => {
  const said = recordAnnouncements();
  const el = await thread({ messages: [msg({ id: 'r', status: 'pending' })] });

  for (const text of ['One', 'One two', 'One two three']) {
    el.messages = [msg({ id: 'r', status: 'streaming', parts: [{ type: 'text', text }] })];
    await el.updateComplete;
  }

  await tick();
  expect(said).toEqual([]);

  el.messages = [msg({ id: 'r', status: 'done', parts: [{ type: 'text', text: 'One **two** three' }] })];
  await el.updateComplete;
  await tick();

  expect(said).toEqual([{ text: 'Assistant replied: One two three', politeness: 'polite' }]);

  el.messages = [...el.messages, msg({ id: 'long', status: 'streaming' })];
  await el.updateComplete;
  el.messages = [el.messages[0], msg({ id: 'long', status: 'done', parts: [{ type: 'text', text: 'x'.repeat(400) }] })];
  await el.updateComplete;
  await tick();

  const long = said[1].text;

  expect(long.startsWith(`Assistant replied: ${'x'.repeat(300)}…`)).toBe(true);
  expect(long.endsWith('Message continues in the conversation.')).toBe(true);
});

it('does not announce history that arrives finished', async () => {
  const said = recordAnnouncements();

  await thread({ messages: [msg({ id: 'a', parts: [{ type: 'text', text: 'Old' }] })] });
  await tick();

  expect(said).toEqual([]);
});

it('announces "Response stopped", and an error assertively', async () => {
  const said = recordAnnouncements();
  const el = await thread({ messages: [msg({ id: 'a', status: 'streaming' }), msg({ id: 'b', status: 'streaming' })] });

  el.messages = [msg({ id: 'a', status: 'stopped' }), msg({ id: 'b', status: 'streaming' })];
  await el.updateComplete;
  await tick();
  el.messages = [msg({ id: 'a', status: 'stopped' }), msg({ id: 'b', status: 'error', error: 'Server down' })];
  await el.updateComplete;
  await tick();

  expect(said).toEqual([
    { text: 'Response stopped', politeness: 'polite' },
    { text: 'Server down', politeness: 'assertive' },
  ]);
});

it('announces the translated error term when the message carries a known code', async () => {
  const said = recordAnnouncements();
  const el = await thread({ messages: [msg({ id: 'a', status: 'streaming' })] });

  el.messages = [msg({ id: 'a', status: 'error', error: 'The response was too long and was stopped.', errorCode: 'too-long' })];
  await el.updateComplete;
  await tick();

  expect(said).toEqual([{ text: 'The response was too long and was stopped.', politeness: 'assertive' }]);
});

it('Page Down and Page Up move focus between articles, and the last focused one is the tab stop', async () => {
  const el = await thread({ messages: ['a', 'b', 'c'].map((id) => msg({ id })) });
  await Promise.all(items(el).map((m) => m.updateComplete));

  expect(items(el).map((m) => m.tabStop)).toEqual([false, false, true]);

  const [a, b] = items(el);

  const key = (/** @type {string} */ k, /** @type {HTMLElement} */ from) =>
    articleOf(from).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, composed: true, cancelable: true }));

  a.focus();
  key('PageDown', a);
  await el.updateComplete;

  expect(b.shadowRoot.activeElement).toBe(articleOf(b));
  expect(items(el).map((m) => m.tabStop)).toEqual([false, true, false]);

  key('PageUp', b);
  await el.updateComplete;
  expect(a.shadowRoot.activeElement).toBe(articleOf(a));

  // At the ends nothing moves, and other keys are left alone.
  const event = new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true, composed: true, cancelable: true });

  articleOf(a).dispatchEvent(event);
  expect(event.defaultPrevented).toBe(false);
});

it('auto-scrolls while the reader is at the bottom, and offers "Jump to latest" otherwise', async () => {
  const el = await thread({ messages: [msg({ id: 'a', status: 'streaming', parts: [{ type: 'text', text: 'x' }] })] });
  const box = layout(el);

  el.messages = [msg({ id: 'a', status: 'streaming', parts: [{ type: 'text', text: 'xy' }] })];
  await el.updateComplete;

  expect(box.top).toBe(800);
  expect(jump(el).hidden).toBe(true);

  // The reader scrolls up: new content no longer moves the view.
  box.scrollTo(300);
  await el.updateComplete;
  box.grow(500);
  el.messages = [msg({ id: 'a', status: 'streaming', parts: [{ type: 'text', text: 'xyz' }] })];
  await el.updateComplete;

  expect(box.top).toBe(300);
  expect(jump(el).hidden).toBe(false);
  expect(jump(el).textContent.trim()).toBe('Jump to latest');

  // Jump: to the bottom, focus on the latest message, and following again.
  jump(el).click();
  await el.updateComplete;

  expect(box.top).toBe(1300);
  expect(jump(el).hidden).toBe(true);
  expect(items(el)[0].shadowRoot.activeElement).toBe(articleOf(items(el)[0]));
});

it('sending a message while scrolled up follows the thread again', async () => {
  const el = await thread({ messages: [msg({ id: 'a', parts: [{ type: 'text', text: 'x' }] })] });
  const box = layout(el);

  box.scrollTo(300);
  await el.updateComplete;
  expect(jump(el).hidden).toBe(false);

  box.grow(200);
  el.messages = [...el.messages, msg({ id: 'u', role: 'user', parts: [{ type: 'text', text: 'new question' }] })];
  await el.updateComplete;

  expect(box.top).toBe(1000);
  expect(jump(el).hidden).toBe(true);
});

it.each([
  ['tool calls only', [{ type: 'tool-call', id: 't', name: 'search', input: {}, status: 'done' }]],
  ['sources only', [{ type: 'source', url: 'https://a.example', title: 'A' }]],
  ['reasoning only', [{ type: 'reasoning', text: 'thinking' }]],
])('a reply with %s is announced with its own term, not a dangling colon', async (_name, parts) => {
  const said = recordAnnouncements();
  const el = await thread({ messages: [msg({ id: 'a', status: 'streaming' })] });

  el.messages = [msg({ id: 'a', status: 'done', parts: /** @type {any} */ (parts) })];
  await el.updateComplete;
  await tick();

  expect(said).toEqual([{ text: 'Assistant replied without text.', politeness: 'polite' }]);
});

it('announces the too-large error term', async () => {
  const said = recordAnnouncements();
  const el = await thread({ messages: [msg({ id: 'a', status: 'streaming' })] });

  el.messages = [msg({ id: 'a', status: 'error', error: 'The response was too large.', errorCode: 'too-large' })];
  await el.updateComplete;
  await tick();

  expect(said).toEqual([{ text: 'The response was too large and was stopped.', politeness: 'assertive' }]);
});

it('a thread that is moved observes its feed again', async () => {
  /** @type {Element[][]} */
  const observed = [];

  vi.stubGlobal(
    'ResizeObserver',
    class {
      /** @type {Element[]} */
      targets = [];

      constructor() {
        observed.push(this.targets);
      }

      observe(/** @type {Element} */ target) {
        this.targets.push(target);
      }

      disconnect() {
        this.targets.length = 0;
      }
    },
  );

  const el = await thread({ messages: [msg({ id: 'a' })] });
  const host = document.createElement('div');

  document.body.append(host);
  host.append(el);
  await el.updateComplete;

  expect(observed.some((targets) => targets.includes(feed(el)))).toBe(true);
});
