// The scripted transport replays chunk arrays with timers, so the demo needs no API key (R3).
import { expect, it, vi } from 'vitest';
import { scriptedTransport } from '../src/chat/index.js';

/** @param {AsyncIterable<any>} iterable */
async function collect(iterable) {
  const out = [];

  for await (const x of iterable) out.push(x);

  return out;
}

const send = (/** @type {ReturnType<typeof scriptedTransport>} */ t, signal = new AbortController().signal) =>
  collect(t.send({ messages: [], signal }));

it('replays one turn per send, in order, cycling', async () => {
  const t = scriptedTransport([[{ type: 'text-delta', id: 'a', delta: 'one' }], [{ type: 'text-delta', id: 'b', delta: 'two' }]], {
    delay: 0,
  });

  expect((await send(t)).map((c) => c.delta)).toEqual(['one']);
  expect((await send(t)).map((c) => c.delta)).toEqual(['two']);
  expect((await send(t)).map((c) => c.delta)).toEqual(['one']);
});

it('splits a string turn into word deltas and a finish', async () => {
  const chunks = await send(scriptedTransport(['Hello brave world'], { delay: 0 }));

  expect(chunks.filter((c) => c.type === 'text-delta').map((c) => c.delta)).toEqual(['Hello ', 'brave ', 'world']);
  expect(chunks.at(-1)).toEqual({ type: 'finish', reason: 'stop' });
});

it('accepts a function of the conversation', async () => {
  const t = scriptedTransport((messages) => [{ type: 'text-delta', id: 'x', delta: String(messages.length) }], { delay: 0 });

  expect((await collect(t.send({ messages: [], signal: new AbortController().signal })))[0].delta).toBe('0');
});

it('waits `delay` ms between chunks', async () => {
  vi.useFakeTimers();

  try {
    const t = scriptedTransport(['a b c'], { delay: 24 });
    const done = send(t);

    await vi.advanceTimersByTimeAsync(24 * 4);
    expect((await done).length).toBe(4);
  } finally {
    vi.useRealTimers();
  }
});

it('stops at once when aborted, even mid-wait', async () => {
  const controller = new AbortController();
  const t = scriptedTransport(['a b c d e f'], { delay: 50 });
  const out = [];

  for await (const chunk of t.send({ messages: [], signal: controller.signal })) {
    out.push(chunk);

    if (out.length === 2) controller.abort();
  }

  expect(out.length).toBe(2);
});
