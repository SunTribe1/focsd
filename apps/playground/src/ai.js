import './base.js';
import '@focsd/components';
import { createChat, scriptedTransport } from '@focsd/ai';

// The scripted transport replays canned replies, so this page needs no server and no key.
// `?delay=N` sets the milliseconds between chunks (default 24); the end-to-end specs use a small one.
const params = new URLSearchParams(location.search);
const delay = Number(params.get('delay') ?? 24);

const SOURCES = [
  { type: 'source', url: 'https://developer.mozilla.org/docs/Web/API/Server-sent_events', title: 'Server-sent events' },
  { type: 'source', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/feed/', title: 'Feed pattern' },
];

const MARKDOWN = `Streaming markdown is **built as it arrives**. Finished blocks keep their nodes, so a selection inside them survives.

- Lists, *emphasis* and \`inline code\`
- [A link](https://focsd.dev) that is safe to follow
- <script>alert(1)</script> shown as text

\`\`\`js
const chat = createChat({ transport });
await chat.send('Hello');
\`\`\``;

const paragraph = (n) =>
  `Paragraph ${n} of a long reply. It keeps streaming so the page has to scroll, and the reader can scroll up without being pulled back down.`;

/** Words of text as deltas, then a finish. */
const text = (body) => [
  ...(body.match(/\S+\s*/g) ?? []).map((delta) => ({ type: 'text-delta', id: 'text', delta })),
  { type: 'finish', reason: 'stop' },
];

const toolReply = () => [
  { type: 'reasoning-delta', id: 'why', delta: 'The question needs the docs, so search them first. ' },
  { type: 'tool-call', id: 'call-1', name: 'search_docs', input: { query: 'server-sent events', limit: 2 } },
  { type: 'tool-result', id: 'call-1', output: { hits: 2, titles: SOURCES.map((s) => s.title) }, status: 'done' },
  ...SOURCES,
  ...text('I found two sources. Server-sent events are one JSON object per `data:` line.'),
];

// cspell:ignore avascript
/** Markdown a hostile or broken model might send: every piece must stay inert text or a safe link. */
const HOSTILE = `<script>window.__pwned = true</script> and <img src=x onerror="window.__pwned = true">

- [a script link](javascript:window.__pwned=true)
- [an encoded one](&#106;avascript:window.__pwned=true)
- [a data link](data:text/html,<script>window.__pwned=true</script>)
- [a spaced one]( JaVa\tScRiPt:window.__pwned=true)
- [a safe one](https://focsd.dev)

<a href="javascript:window.__pwned=true" onclick="window.__pwned=true">raw anchor</a>`;

/** A tool call whose output is long enough to scroll (200 lines). */
const longToolReply = () => [
  { type: 'tool-call', id: 'call-2', name: 'list_files', input: { path: '/' } },
  { type: 'tool-result', id: 'call-2', output: Array.from({ length: 200 }, (_, i) => `file-${i + 1}.txt`), status: 'done' },
  ...text('The folder holds 200 files.'),
];

/** The reply to the last thing the person said. */
function reply(messages) {
  const last = messages.findLast((m) => m.role === 'user');
  const said = last?.parts.map((p) => (p.type === 'text' ? p.text : '')).join(' ') ?? '';

  if (/hostile/i.test(said)) return text(HOSTILE);

  if (/long tool/i.test(said)) return longToolReply();

  if (/tool/i.test(said)) return toolReply();

  if (/long/i.test(said)) return text(Array.from({ length: 14 }, (_, i) => paragraph(i + 1)).join('\n\n'));

  if (/error/i.test(said)) return [{ type: 'error', message: 'Service Unavailable', code: 'http' }];

  return text(MARKDOWN);
}

const chat = createChat({ transport: scriptedTransport(reply, { delay }) });
const thread = document.getElementById('thread');
const composer = document.getElementById('composer');
const suggestions = document.getElementById('suggestions');

thread.chat = chat;

suggestions.suggestions = ['Explain streaming markdown', 'Show a tool call', 'Write a long answer', 'Trigger an error'];

/** The controller keeps file names, types and sizes, not the bytes. */
const refs = (files) => files.map((f) => ({ name: f.name, mediaType: f.type, size: f.size }));

composer.addEventListener('focsd-submit', (event) => chat.send(event.detail.text, refs(event.detail.files)));

composer.addEventListener('focsd-stop', () => chat.stop());

suggestions.addEventListener('focsd-suggestion-select', (event) => {
  chat.send(event.detail.text);
  composer.focus();
});

chat.subscribe(({ status }) => {
  composer.busy = status === 'streaming';
});

await Promise.all(['focsd-chat-thread', 'focsd-composer', 'focsd-prompt-suggestions'].map((tag) => customElements.whenDefined(tag)));

window.__chat = chat;

window.__ready = true;
