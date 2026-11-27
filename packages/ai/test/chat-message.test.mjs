// @vitest-environment happy-dom
// focsd-chat-message: one message as an article, named by its author and time, rendering its parts
// in order, busy while it streams.
import { afterEach, expect, it } from 'vitest';
import '../src/chat-message.js';

afterEach(() => document.body.replaceChildren());

const AT = Date.UTC(2026, 10, 24, 9, 5);

/** @param {Partial<import('../src/chat/types.js').Message>} m */
const msg = (m) => ({ id: 'm1', role: 'assistant', status: 'done', parts: [], createdAt: AT, ...m });

/** @param {Record<string, unknown>} props */
async function message(props) {
  const el = Object.assign(document.createElement('focsd-chat-message'), props);
  document.body.append(el);
  await el.updateComplete;

  return el;
}

const article = (/** @type {HTMLElement} */ el) => el.shadowRoot.querySelector('article[part="bubble"]');
const body = (/** @type {HTMLElement} */ el) => el.shadowRoot.querySelector('[part="body"]');

it('is an article named by the author and time, with author and meta parts', async () => {
  const el = await message({ message: msg({ role: 'user', parts: [{ type: 'text', text: 'Hi' }] }) });
  const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(AT);

  expect(article(el).getAttribute('aria-label')).toBe(`You, ${time}`);
  expect(el.shadowRoot.querySelector('[part="author"]').textContent.trim()).toBe('You');
  expect(el.shadowRoot.querySelector('[part="meta"] time').getAttribute('datetime')).toBe(new Date(AT).toISOString());
  expect(el.getAttribute('from')).toBe('user');
});

it.each([
  ['assistant', 'Assistant'],
  ['system', 'System'],
  ['tool', 'Tool'],
])('a %s message is by "%s"', async (role, author) => {
  const el = await message({ message: msg({ role, createdAt: undefined }) });

  expect(article(el).getAttribute('aria-label')).toBe(author);
  expect(el.getAttribute('from')).toBe(role);
});

it('is aria-busy only while pending or streaming', async () => {
  const el = await message({ message: msg({ status: 'streaming', parts: [{ type: 'text', text: 'Hel' }] }) });

  expect(article(el).getAttribute('aria-busy')).toBe('true');

  el.message = msg({ status: 'done', parts: [{ type: 'text', text: 'Hello' }] });
  await el.updateComplete;

  expect(article(el).hasAttribute('aria-busy')).toBe(false);
});

it('carries its feed position', async () => {
  const el = await message({ message: msg({}), posinset: 2, setsize: 5 });

  expect(article(el).getAttribute('aria-posinset')).toBe('2');
  expect(article(el).getAttribute('aria-setsize')).toBe('5');
});

it('renders the parts in order', async () => {
  const el = await message({
    message: msg({
      parts: [
        { type: 'reasoning', text: 'Let me think' },
        { type: 'tool-call', id: 't1', name: 'search', input: { q: 'x' }, status: 'done', output: [1] },
        { type: 'text', text: 'The **answer**' },
        { type: 'source', url: 'https://a.example', title: 'A' },
        { type: 'source', url: 'https://b.example', title: 'B' },
        { type: 'file', name: 'notes.txt', mediaType: 'text/plain', size: 2048 },
      ],
    }),
  });

  const tags = [...body(el).children].map((c) => c.tagName.toLowerCase());

  expect(tags).toEqual(['focsd-reasoning', 'focsd-tool-call', 'focsd-streaming-text', 'ul', 'span']);

  const tool = body(el).querySelector('focsd-tool-call');

  expect([tool.name, tool.status, tool.input, tool.output]).toEqual(['search', 'done', { q: 'x' }, [1]]);
  expect(body(el).querySelector('focsd-streaming-text').text).toBe('The **answer**');

  const sources = body(el).querySelector('ul');

  expect(sources.getAttribute('aria-label')).toBe('Sources');
  expect([...sources.querySelectorAll('focsd-source-chip')].map((c) => [c.index, c.href, c.label])).toEqual([
    [1, 'https://a.example', 'A'],
    [2, 'https://b.example', 'B'],
  ]);
  expect(body(el).querySelector('span.file').textContent).toContain('notes.txt');
  expect(body(el).querySelector('span.file').textContent).toContain('2 kB');
});

it('streams only the last part; user text is plain, assistant text markdown', async () => {
  const el = await message({
    message: msg({
      status: 'streaming',
      parts: [
        { type: 'reasoning', text: 'a' },
        { type: 'text', text: 'b' },
      ],
    }),
  });

  expect(body(el).querySelector('focsd-reasoning').streaming).toBe(false);
  expect(body(el).querySelector('focsd-streaming-text').streaming).toBe(true);
  expect(body(el).querySelector('focsd-streaming-text').plain).toBe(false);

  const user = await message({ message: msg({ role: 'user', parts: [{ type: 'text', text: '**x**' }] }) });

  expect(body(user).querySelector('focsd-streaming-text').plain).toBe(true);
});

it('a pending reply shows the caret alone', async () => {
  const el = await message({ message: msg({ status: 'pending', parts: [] }) });
  const text = body(el).querySelector('focsd-streaming-text');

  expect(text.streaming).toBe(true);
  expect(text.text).toBe('');
});

it('a finished assistant message gets actions with its plain text; a user or streaming one does not', async () => {
  const el = await message({ message: msg({ parts: [{ type: 'text', text: 'Some **bold**' }] }) });
  const actions = el.shadowRoot.querySelector('focsd-message-actions');

  expect(actions.for).toBe('m1');
  expect(actions.text).toBe('Some bold');

  const streaming = await message({ message: msg({ status: 'streaming', parts: [{ type: 'text', text: 'x' }] }) });
  const user = await message({ message: msg({ role: 'user', parts: [{ type: 'text', text: 'x' }] }) });

  expect(streaming.shadowRoot.querySelector('focsd-message-actions')).toBeNull();
  expect(user.shadowRoot.querySelector('focsd-message-actions')).toBeNull();
});

it.each([
  ['too-long', 'Anything', 'The response was too long and was stopped.'],
  ['network', 'Anything', 'The response could not be loaded.'],
  ['http', 'Service Unavailable', 'The server returned an error: Service Unavailable.'],
  [undefined, 'Server down', 'Server down'],
  ['unheard-of', 'Server down', 'Server down'],
])('the error code %s picks the translated error term', async (errorCode, error, shown) => {
  const el = await message({ message: msg({ status: 'error', error, errorCode, parts: [] }) });

  expect(el.shadowRoot.querySelector('.error').textContent.trim()).toBe(shown);
});

it('shows the error of a failed message and notes a stopped one', async () => {
  const failed = await message({ message: msg({ status: 'error', error: 'Server down', parts: [] }) });

  expect(body(failed).textContent).toContain('Server down');

  const stopped = await message({ message: msg({ status: 'stopped', parts: [{ type: 'text', text: 'Hal' }] }) });

  expect(stopped.shadowRoot.querySelector('[part="meta"]').textContent).toContain('Response stopped');
});

it('focus() focuses the article; tab-stop sets its tabindex', async () => {
  const el = await message({ message: msg({}) });

  expect(article(el).getAttribute('tabindex')).toBe('-1');

  el.tabStop = true;
  await el.updateComplete;

  expect(article(el).getAttribute('tabindex')).toBe('0');
  el.focus();
  expect(el.shadowRoot.activeElement).toBe(article(el));
});

it('renders nothing but the frame without a message', async () => {
  const el = await message({});

  expect(article(el)).not.toBeNull();
  expect(body(el).children).toHaveLength(0);
});

it.each(['__proto__', 'constructor', 'toString'])('a saved role %s is shown as the assistant', async (role) => {
  const el = await message({ message: msg({ role: /** @type {any} */ (role), parts: [{ type: 'text', text: 'x' }] }) });

  expect(el.shadowRoot.querySelector('[part="author"]').textContent).toBe('Assistant');
});
