// The SSE line reader and the fetch transport (R5): split chunks, CRLF, comments, multi-line
// data, unknown types, the 1 MB cap, non-2xx responses and abort.
import { expect, it } from 'vitest';
import { createChat, fetchSseTransport, parseSse } from '../src/chat/index.js';

const enc = new TextEncoder();

/** A ReadableStream that delivers the given pieces as separate reads. */
const streamOf = (/** @type {(string | Uint8Array)[]} */ pieces) =>
  new ReadableStream({
    start(controller) {
      for (const p of pieces) controller.enqueue(p instanceof Uint8Array ? p : enc.encode(p));
      controller.close();
    },
  });

/** @param {AsyncIterable<any>} iterable */
async function collect(iterable) {
  const out = [];

  for await (const x of iterable) out.push(x);

  return out;
}

it('reads events split across reads at any point', async () => {
  const text = 'data: {"a":1}\n\ndata: {"b":2}\n\n';
  const pieces = [...text].map((c) => c);

  expect(await collect(parseSse(streamOf(pieces)))).toEqual([
    { event: 'message', data: '{"a":1}', id: '' },
    { event: 'message', data: '{"b":2}', id: '' },
  ]);
});

it('splits a multi-byte character across reads safely', async () => {
  const bytes = enc.encode('data: é€\n\n');

  expect((await collect(parseSse(streamOf([bytes.slice(0, 7), bytes.slice(7)]))))[0].data).toBe('é€');
});

it('handles CRLF, lone CR (also split between reads), comments, fields and multi-line data', async () => {
  const events = await collect(parseSse(streamOf([': ping\r\nevent: x\r\nid: 7\r\ndata: one\r', '\ndata:two\r\rdata: three\r\n\r\n'])));

  expect(events).toEqual([
    { event: 'x', data: 'one\ntwo', id: '7' },
    { event: 'message', data: 'three', id: '7' },
  ]);
});

it('ignores a trailing event without a blank line, and events with no data', async () => {
  expect(await collect(parseSse(streamOf(['event: x\n\ndata: partial'])))).toEqual([]);
});

it('refuses an over-long line instead of buffering without limit', async () => {
  await expect(collect(parseSse(streamOf([`data: ${'x'.repeat(2000)}`]), { maxLine: 1000 }))).rejects.toThrow(/too long/);
});

/** A fetch stub answering with the given body pieces. */
function fetchStub(/** @type {(string | Uint8Array)[]} */ pieces, init = {}) {
  /** @type {any[]} */
  const calls = [];

  const fetch = async (/** @type {any} */ url, /** @type {any} */ options) => {
    calls.push({ url, options });

    return new Response(streamOf(pieces), { status: 200, ...init });
  };

  return { fetch: /** @type {typeof globalThis.fetch} */ (/** @type {unknown} */ (fetch)), calls };
}

const line = (/** @type {object} */ obj) => `data: ${JSON.stringify(obj)}\n\n`;

it('posts the messages as JSON and yields known chunks, skipping unknown types and bad JSON', async () => {
  const { fetch, calls } = fetchStub([
    line({ type: 'text-delta', id: 't', delta: 'Hi' }),
    line({ type: 'mystery', x: 1 }),
    'data: {not json\n\n',
    line({ type: 'text-delta', id: 't', delta: 42 }),
    line({ type: 'source', url: 'https://a.example', title: 'A' }),
    line({ type: 'finish', reason: 'stop' }),
  ]);

  const transport = fetchSseTransport({ url: '/api/chat', headers: { 'x-k': '1' }, fetch });
  const chunks = await collect(transport.send({ messages: [], signal: new AbortController().signal }));

  expect(chunks.map((c) => c.type)).toEqual(['text-delta', 'source', 'finish']);
  expect(calls[0].url).toBe('/api/chat');
  expect(calls[0].options.method).toBe('POST');
  expect(calls[0].options.headers['x-k']).toBe('1');
  expect(JSON.parse(calls[0].options.body)).toEqual({ messages: [] });
});

it('uses a custom body builder', async () => {
  const { fetch, calls } = fetchStub([]);
  const transport = fetchSseTransport({ url: '/x', fetch, body: (messages) => ({ model: 'm', n: messages.length }) });

  await collect(transport.send({ messages: [], signal: new AbortController().signal }));
  expect(JSON.parse(calls[0].options.body)).toEqual({ model: 'm', n: 0 });
});

it('turns a non-2xx response into an error chunk with the status text', async () => {
  const { fetch } = fetchStub([], { status: 503, statusText: 'Service Unavailable' });
  const chunks = await collect(fetchSseTransport({ url: '/x', fetch }).send({ messages: [], signal: new AbortController().signal }));

  expect(chunks).toEqual([{ type: 'error', message: 'Service Unavailable', code: 'http' }]);
});

it('stops with an error once a message passes the text cap', async () => {
  const { fetch } = fetchStub([
    line({ type: 'text-delta', id: 't', delta: 'x'.repeat(600) }),
    line({ type: 'reasoning-delta', id: 'r', delta: 'y'.repeat(600) }),
    line({ type: 'text-delta', id: 't', delta: 'never' }),
  ]);

  const chunks = await collect(
    fetchSseTransport({ url: '/x', fetch, maxText: 1000 }).send({ messages: [], signal: new AbortController().signal }),
  );

  expect(chunks.map((c) => c.type)).toEqual(['text-delta', 'error']);
  expect(chunks[1].code).toBe('too-long');
});

it('caps a message at 1 MB of text by default', async () => {
  const big = line({ type: 'text-delta', id: 't', delta: 'x'.repeat(600_000) });
  const { fetch } = fetchStub([big, big]);
  const chunks = await collect(fetchSseTransport({ url: '/x', fetch }).send({ messages: [], signal: new AbortController().signal }));

  expect(chunks.map((c) => c.type)).toEqual(['text-delta', 'error']);
});

it('stops reading when aborted', async () => {
  const controller = new AbortController();
  /** @type {ReadableStreamDefaultController<Uint8Array> | undefined} */
  let source;

  const body = new ReadableStream({
    start(c) {
      source = c;
      c.enqueue(enc.encode(line({ type: 'text-delta', id: 't', delta: 'a' })));
    },
  });

  const fetch = /** @type {typeof globalThis.fetch} */ (/** @type {unknown} */ (async () => new Response(body)));
  const chunks = [];

  for await (const chunk of fetchSseTransport({ url: '/x', fetch }).send({ messages: [], signal: controller.signal })) {
    chunks.push(chunk);
    controller.abort();
    source?.enqueue(enc.encode(line({ type: 'text-delta', id: 't', delta: 'b' })));
  }

  expect(chunks.length).toBe(1);
});

it('refuses an event whose data lines never end (no blank line) instead of buffering without limit', async () => {
  const pieces = Array.from({ length: 1000 }, () => 'data: 0123456789\n');

  await expect(collect(parseSse(streamOf(pieces), { maxLine: 1000 }))).rejects.toThrow(RangeError);
});

it.each([
  ['an endless data buffer', Array.from({ length: 2000 }, () => `data: ${'x'.repeat(2000)}\n`)],
  ['an over-long line', [`data: ${'x'.repeat(2 ** 21 + 10)}`]],
])('%s ends the reply with a too-large error', async (_name, pieces) => {
  const { fetch } = fetchStub(pieces);
  const chat = createChat({ transport: fetchSseTransport({ url: '/x', fetch }), schedule: (fn) => fn() });

  await expect(
    collect(fetchSseTransport({ url: '/x', fetch }).send({ messages: [], signal: new AbortController().signal })),
  ).rejects.toThrow(RangeError);
  await chat.send('hi');
  expect(chat.messages.at(-1)).toMatchObject({ status: 'error', errorCode: 'too-large' });
  expect(chat.status).toBe('error');
});

it('cancels the body of a non-2xx response', async () => {
  let cancelled = false;

  const body = new ReadableStream({
    cancel() {
      cancelled = true;
    },
  });

  const fetch = /** @type {typeof globalThis.fetch} */ (
    /** @type {unknown} */ (async () => new Response(body, { status: 500, statusText: 'Oops' }))
  );

  await collect(fetchSseTransport({ url: '/x', fetch }).send({ messages: [], signal: new AbortController().signal }));
  expect(cancelled).toBe(true);
});

it('turns a failed fetch (offline) into a network error chunk', async () => {
  const fetch = /** @type {typeof globalThis.fetch} */ (
    /** @type {unknown} */ (
      async () => {
        throw new TypeError('Failed to fetch');
      }
    )
  );

  const chunks = await collect(fetchSseTransport({ url: '/x', fetch }).send({ messages: [], signal: new AbortController().signal }));

  expect(chunks).toEqual([{ type: 'error', message: 'Failed to fetch', code: 'network' }]);
});

it('lets an abort from fetch through (it is not a network error)', async () => {
  const fetch = /** @type {typeof globalThis.fetch} */ (
    /** @type {unknown} */ (
      async () => {
        throw new DOMException('Aborted', 'AbortError');
      }
    )
  );

  await expect(
    collect(fetchSseTransport({ url: '/x', fetch }).send({ messages: [], signal: new AbortController().signal })),
  ).rejects.toThrow('Aborted');
});

it('reads one large read of many short lines (the cap is per line)', async () => {
  const text = line({ type: 'text-delta', id: 't', delta: 'ab' }).repeat(2000);
  const events = await collect(parseSse(streamOf([text]), { maxLine: 1000 }));

  expect(events.length).toBe(2000);
});
