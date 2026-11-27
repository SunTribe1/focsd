// The chat controller: immutable updates, frame-coalesced deltas, stop, retry and errors.
import { expect, it } from 'vitest';
import { applyChunk, createChat, scriptedTransport } from '../src/chat/index.js';

/** A manual frame scheduler: deltas are applied only when the test runs a frame. */
function frames() {
  /** @type {(() => void)[]} */
  let queue = [];

  return {
    schedule: (/** @type {() => void} */ fn) => queue.push(fn),
    run() {
      const due = queue;

      queue = [];

      for (const fn of due) fn();
    },
    get pending() {
      return queue.length;
    },
  };
}

/** A transport the test drives chunk by chunk. */
function manual() {
  /** @type {((value: any) => void)[]} */
  const waiting = [];
  /** @type {any[]} */
  const queue = [];
  /** @type {{ messages: any[], signal: AbortSignal }[]} */
  const calls = [];

  return {
    calls,
    push(/** @type {any} */ chunk) {
      const next = waiting.shift();

      if (next) next(chunk);
      else queue.push(chunk);
    },
    /** @param {{ messages: any[], signal: AbortSignal }} request */
    async *send(request) {
      calls.push(request);

      for (;;) {
        const chunk = queue.length ? queue.shift() : await new Promise((resolve) => waiting.push(resolve));

        if (chunk === null || request.signal.aborted) return;
        yield chunk;
      }
    },
  };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

it('sends: adds the user message and a pending assistant, then streams into it', async () => {
  const f = frames();
  const chat = createChat({ transport: scriptedTransport(['Hi there'], { delay: 0 }), schedule: f.schedule });
  const seen = [];

  chat.subscribe((state) => seen.push(state));
  const done = chat.send('Hello');

  expect(chat.messages.map((m) => [m.role, m.status])).toEqual([
    ['user', 'done'],
    ['assistant', 'pending'],
  ]);
  expect(chat.status).toBe('streaming');
  await done;
  expect(chat.messages[1]).toMatchObject({ status: 'done', parts: [{ type: 'text', text: 'Hi there' }] });
  expect(chat.status).toBe('idle');
  expect(seen.length).toBeGreaterThan(1);
});

it('never mutates: each update makes a new array and a new message object', async () => {
  const f = frames();
  const t = manual();
  const chat = createChat({ transport: t, schedule: f.schedule });

  chat.send('q');
  const before = chat.messages;
  const beforeUser = before[0];
  const beforeAssistant = before[1];

  t.push({ type: 'text-delta', id: 't', delta: 'a' });
  await tick();
  f.run();

  expect(chat.messages).not.toBe(before);
  expect(chat.messages[0]).toBe(beforeUser);
  expect(chat.messages[1]).not.toBe(beforeAssistant);
  expect(beforeAssistant?.parts).toEqual([]);
  t.push(null);
});

it('coalesces a 200-delta burst into one update per frame', async () => {
  const f = frames();
  const t = manual();
  const chat = createChat({ transport: t, schedule: f.schedule });
  let updates = 0;

  chat.send('q');
  chat.subscribe(() => updates++);

  for (let i = 0; i < 200; i++) t.push({ type: 'text-delta', id: 't', delta: 'x' });
  await tick();

  expect(f.pending).toBe(1);
  f.run();
  expect(updates).toBe(1);
  expect(chat.messages[1]?.parts).toEqual([{ type: 'text', text: 'x'.repeat(200) }]);
  t.push(null);
});

it('stop aborts the transport and marks the message stopped', async () => {
  const f = frames();
  const t = manual();
  const chat = createChat({ transport: t, schedule: f.schedule });
  const done = chat.send('q');

  t.push({ type: 'text-delta', id: 't', delta: 'partial' });
  await tick();
  chat.stop();

  expect(t.calls[0]?.signal.aborted).toBe(true);
  expect(chat.messages[1]).toMatchObject({ status: 'stopped', parts: [{ type: 'text', text: 'partial' }] });
  expect(chat.status).toBe('idle');
  t.push({ type: 'text-delta', id: 't', delta: 'late' });
  await done;
  expect(chat.messages[1]?.parts).toEqual([{ type: 'text', text: 'partial' }]);
});

it('retry replaces the assistant reply and resends the history before it', async () => {
  const chat = createChat({ transport: scriptedTransport(['first', 'second'], { delay: 0 }) });

  await chat.send('q');
  const oldId = chat.messages[1]?.id ?? '';

  await chat.retry(oldId);

  expect(chat.messages.length).toBe(2);
  expect(chat.messages[1]?.id).not.toBe(oldId);
  expect(chat.messages[1]?.parts).toEqual([{ type: 'text', text: 'second' }]);
});

it('retry on a user message drops what follows it and asks again', async () => {
  const t = manual();
  const chat = createChat({ transport: t });
  const first = chat.send('q');

  t.push(null);
  await first;
  const again = chat.retry(chat.messages[0]?.id ?? '');

  t.push(null);
  await again;
  expect(t.calls[1]?.messages.map((m) => m.role)).toEqual(['user']);
  expect(chat.messages.length).toBe(2);
});

it('an error chunk or a throwing transport marks the message as error', async () => {
  const chat = createChat({ transport: scriptedTransport([[{ type: 'error', message: 'Boom', code: 'http' }]], { delay: 0 }) });

  await chat.send('q');
  expect(chat.messages[1]).toMatchObject({ status: 'error', error: 'Boom', errorCode: 'http' });
  expect(chat.status).toBe('error');

  const broken = createChat({
    transport: {
      // eslint-disable-next-line require-yield -- a transport that fails before its first chunk
      async *send() {
        throw new Error('offline');
      },
    },
  });

  await broken.send('q');
  expect(broken.messages[1]).toMatchObject({ status: 'error', error: 'offline' });
});

it('setMessages replaces the list, onChange and unsubscribe work', async () => {
  const changes = [];
  const chat = createChat({ transport: scriptedTransport([[]], { delay: 0 }), onChange: (s) => changes.push(s) });
  let calls = 0;
  const off = chat.subscribe(() => calls++);

  off();
  chat.setMessages([{ id: 'm1', role: 'user', status: 'done', parts: [{ type: 'text', text: 'x' }], createdAt: 1 }]);

  expect(chat.messages.map((m) => m.id)).toEqual(['m1']);
  expect(changes.length).toBe(1);
  expect(calls).toBe(0);
});

it('sends files as file parts and ignores a send while streaming', async () => {
  const t = manual();
  const chat = createChat({ transport: t });

  chat.send('see file', [{ name: 'a.txt', mediaType: 'text/plain', size: 3 }]);
  chat.send('ignored');

  expect(chat.messages.length).toBe(2);
  expect(chat.messages[0]?.parts).toEqual([
    { type: 'text', text: 'see file' },
    { type: 'file', name: 'a.txt', mediaType: 'text/plain', size: 3 },
  ]);
  t.push(null);
});

it.each([
  [{ type: 'reasoning-delta', id: 'r', delta: 'think' }, [{ type: 'reasoning', text: 'think' }]],
  [
    { type: 'tool-call', id: 'c1', name: 'search', input: { q: 1 } },
    [{ type: 'tool-call', id: 'c1', name: 'search', input: { q: 1 }, status: 'running' }],
  ],
  [{ type: 'source', url: 'https://a.example', title: 'A' }, [{ type: 'source', url: 'https://a.example', title: 'A' }]],
  [{ type: 'finish', reason: 'stop' }, []],
])('applyChunk %j', (chunk, parts) => {
  const message = { id: 'a', role: 'assistant', status: 'pending', parts: [], createdAt: 0 };
  const next = applyChunk(/** @type {any} */ (message), /** @type {any} */ (chunk));

  expect(next.parts).toEqual(parts);
  expect(message.parts).toEqual([]);
});

it('applyChunk settles a tool call with its result', () => {
  const message = /** @type {any} */ ({
    id: 'a',
    role: 'assistant',
    status: 'streaming',
    parts: [{ type: 'tool-call', id: 'c1', name: 's', input: {}, status: 'running' }],
    createdAt: 0,
  });

  expect(applyChunk(message, { type: 'tool-result', id: 'c1', output: 'ok', status: 'done' }).parts[0]).toMatchObject({
    status: 'done',
    output: 'ok',
  });
  expect(applyChunk(message, { type: 'tool-result', id: 'c1', output: 'no', status: 'error' }).parts[0]).toMatchObject({ status: 'error' });
});

it('finish ends the run even when the transport stays open, and aborts it', async () => {
  const f = frames();
  const t = manual();
  const chat = createChat({ transport: t, schedule: f.schedule });

  chat.send('hi');
  await tick();

  for (const chunk of [
    { type: 'text-delta', id: 'x', delta: 'Done.' },
    { type: 'finish', reason: 'stop' },
  ])
    t.push(chunk);
  await tick();

  const reply = chat.messages.at(-1);

  expect(reply?.status).toBe('done');
  expect(reply?.parts).toEqual([{ type: 'text', text: 'Done.' }]);
  expect(chat.status).toBe('idle');
  expect(t.calls[0]?.signal.aborted).toBe(true);
});

/** A transport that yields `chunk` forever (until aborted). */
const endless = (/** @type {(i: number) => any} */ chunk) => ({
  /** @param {{ signal: AbortSignal }} request */
  async *send({ signal }) {
    for (let i = 0; !signal.aborted; i++) yield chunk(i);
  },
});

it.each([
  ['sources', (/** @type {number} */ i) => ({ type: 'source', url: `https://a.example/${i}`, title: '' })],
  ['tool calls', (/** @type {number} */ i) => ({ type: 'tool-call', id: `t${i}`, name: 'n', input: { i } })],
  ['tool results', (/** @type {number} */ i) => ({ type: 'tool-result', id: `t${i}`, output: 'x'.repeat(1000) })],
  [
    'alternating text and reasoning',
    (/** @type {number} */ i) => ({ type: i % 2 ? 'text-delta' : 'reasoning-delta', id: 'a', delta: 'x' }),
  ],
  ['text', () => ({ type: 'text-delta', id: 'a', delta: 'x'.repeat(10_000) })],
])('an endless stream of %s ends with a too-large error and aborts the transport', async (_name, chunk) => {
  /** @type {AbortSignal | undefined} */
  let signal;

  const inner = endless(chunk);

  const transport = {
    /** @param {{ messages: any[], signal: AbortSignal }} request */
    send(request) {
      signal = request.signal;

      return inner.send(request);
    },
  };

  const chat = createChat({ transport, schedule: (fn) => setTimeout(fn, 0) });

  await chat.send('hi');

  const reply = chat.messages.at(-1);

  expect(reply?.status).toBe('error');
  expect(reply?.errorCode).toBe('too-large');
  expect(reply?.parts.length).toBeLessThanOrEqual(1000);
  expect(signal?.aborted).toBe(true);
  expect(chat.status).toBe('error');
});
