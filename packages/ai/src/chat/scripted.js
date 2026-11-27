// A transport that replays scripted replies with timers, so a demo needs no server or API key.

/**
 * @typedef {import('./types.js').Chunk} Chunk
 * @typedef {import('./types.js').Message} Message
 * @typedef {import('./types.js').Transport} Transport
 * @typedef {string | Chunk[]} Turn A reply: chunks, or a string streamed word by word.
 * @typedef {Turn[] | ((messages: Message[]) => Turn)} Script
 */

/**
 * A string as word-sized text deltas and a finish.
 * @param {string} text
 * @returns {Chunk[]}
 */
const words = (text) => [
  ...(text.match(/\S+\s*/g) ?? []).map((delta) => /** @type {Chunk} */ ({ type: 'text-delta', id: 'text', delta })),
  { type: 'finish', reason: 'stop' },
];

/**
 * Waits `ms`, resolving early (with false) when `signal` aborts.
 * @param {number} ms
 * @param {AbortSignal} signal
 * @returns {Promise<boolean>}
 */
function wait(ms, signal) {
  if (signal.aborted) return Promise.resolve(false);

  if (ms <= 0) return Promise.resolve(true);

  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      resolve(!signal.aborted);
    };

    const timer = setTimeout(done, ms);

    signal.addEventListener('abort', done, { once: true });
  });
}

/**
 * Replays one turn of `script` per send (cycling), waiting `delay` ms before each chunk. A script
 * may also be a function of the conversation. Tests pass `delay: 0`.
 * @param {Script} script
 * @param {{ delay?: number }} [options]
 * @returns {Transport}
 */
export function scriptedTransport(script, { delay = 24 } = {}) {
  let turn = 0;

  return {
    async *send({ messages, signal }) {
      const next = Array.isArray(script) ? (script[turn++ % script.length] ?? []) : script(messages);

      for (const chunk of Array.isArray(next) ? next : words(next)) {
        if (!(await wait(delay, signal))) return;
        yield chunk;
      }
    },
  };
}
