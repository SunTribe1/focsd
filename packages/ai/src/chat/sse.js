// Server-sent events: a line reader for `text/event-stream` bodies and a fetch transport that
// speaks our wire format (R5): one JSON chunk per `data:` line.

/**
 * @typedef {import('./types.js').Chunk} Chunk
 * @typedef {import('./types.js').Message} Message
 * @typedef {import('./types.js').Transport} Transport
 * @typedef {{ event: string, data: string, id: string }} SseEvent
 * @typedef {{
 *   url: string,
 *   headers?: Record<string, string>,
 *   body?: (messages: Message[]) => unknown,
 *   fetch?: typeof globalThis.fetch,
 *   maxText?: number,
 * }} FetchSseOptions
 */

/** The longest line the reader buffers (a little over the 1 MB message cap). */
const MAX_LINE = 2 ** 21;

/** The most text (deltas of text and reasoning together) one message may stream (R5). */
const MAX_TEXT = 2 ** 20;

/**
 * Decoded lines of a byte stream, split on CRLF, LF or a lone CR, also when a CRLF pair is split
 * between two reads.
 * @param {ReadableStream<Uint8Array>} body
 * @param {number} maxLine
 * @returns {AsyncGenerator<string>}
 */
async function* lines(body, maxLine) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let rest = '';

  try {
    for (let read = await reader.read(); !read.done; read = await reader.read()) {
      const text = decoder.decode(read.value, { stream: true });
      // Only a read with a line break is split; otherwise the held line grows by concatenation
      // (a rope in engines), so a long line in many small reads is not re-split on every read.
      const parts = /[\r\n]/.test(text) ? (rest + text).split(/\r\n|\n|\r(?!$)/) : [rest + text];

      rest = parts.pop() ?? '';

      if (rest.length > maxLine) throw new RangeError('SSE line too long');
      yield* parts;
    }

    // A trailing CR ends a line too; anything else left over is an unfinished line and is dropped.
    if (rest.endsWith('\r')) yield rest.slice(0, -1);
  } finally {
    // Stops the body when the consumer returns early (abort, cap) or a read fails.
    reader.cancel().catch(() => {});
  }
}

/**
 * Parses an event stream into events (WHATWG rules): `:` comments are skipped, `data` lines join
 * with `\n`, a blank line dispatches, and an unfinished event at the end is dropped. A line, or
 * the lines of one event together, longer than `maxLine` characters throws a RangeError.
 * @param {ReadableStream<Uint8Array>} body
 * @param {{ maxLine?: number }} [options]
 * @returns {AsyncGenerator<SseEvent>}
 */
export async function* parseSse(body, { maxLine = MAX_LINE } = {}) {
  let event = '';
  let id = '';
  /** @type {string[]} */
  let data = [];
  let size = 0;

  for await (const line of lines(body, maxLine)) {
    // The lines of one event (up to its blank line) are capped together, like a single line.
    size = line.length && size + line.length;

    if (size > maxLine) throw new RangeError('SSE line too long');

    if (line === '') {
      if (data.length) yield { event: event || 'message', data: data.join('\n'), id };
      event = '';
      data = [];
      continue;
    }

    // With no colon the index is past the end: the whole line is the field and the value is ''.
    const colon = line.indexOf(':') >>> 0;
    const field = line.slice(0, colon);
    const value = line.slice(colon + (line[colon + 1] === ' ' ? 2 : 1));

    if (field === 'data') data.push(value);
    else if (field === 'event') event = value;
    else if (field === 'id' && !value.includes('\0')) id = value;
  }
}

/** A JSON string (only a string equals its own template-literal form). */
const isText = (/** @type {unknown} */ v) => v === `${v}`;

/**
 * Checks for each known chunk type; anything else (or a malformed chunk) is ignored. A Map, so a
 * `type` such as "constructor" or "__proto__" never finds an inherited entry.
 */
const VALID = new Map(
  /** @type {[string, (c: any) => boolean][]} */ ([
    ['text-delta', (c) => isText(c.delta)],
    ['reasoning-delta', (c) => isText(c.delta)],
    ['tool-call', (c) => isText(c.id) && isText(c.name)],
    ['tool-result', (c) => isText(c.id)],
    ['source', (c) => isText(c.url) && isText(c.title ?? '')],
    ['finish', () => true],
    ['error', (c) => isText(c.message)],
  ]),
);

/**
 * The chunk in a `data:` payload, or null when it is not valid JSON or not a known, well-formed type.
 * @param {string} data
 * @returns {Chunk | null}
 */
function toChunk(data) {
  try {
    const value = JSON.parse(data);
    const check = Object(value) === value ? VALID.get(value.type) : undefined;

    return check?.(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * The chunks of a response body, stopping with an error once `maxText` characters have streamed.
 * A line or an event over the reader's cap throws a RangeError, which the controller turns into a
 * `too-large` error.
 * @param {ReadableStream<Uint8Array>} body
 * @param {number} maxText
 * @returns {AsyncGenerator<Chunk>}
 */
async function* chunks(body, maxText) {
  let size = 0;

  for await (const { data } of parseSse(body)) {
    const chunk = toChunk(data);

    if (!chunk) continue;

    if (chunk.type === 'text-delta' || chunk.type === 'reasoning-delta') size += chunk.delta.length;

    if (size > maxText) {
      yield { type: 'error', message: 'The response was too long.', code: 'too-long' };

      return;
    }

    yield chunk;
  }
}

/**
 * A transport that POSTs the conversation as JSON and reads our SSE format back. A non-2xx
 * response becomes an `error` chunk with the status text (code `http`), a failed fetch one with
 * code `network`; a line or event over the reader's cap throws a RangeError (the controller ends
 * the reply with code `too-large`). `signal` aborts the request and the read.
 * @param {FetchSseOptions} options
 * @returns {Transport}
 */
export function fetchSseTransport({
  url,
  headers = {},
  body = (messages) => ({ messages }),
  fetch = globalThis.fetch,
  maxText = MAX_TEXT,
}) {
  return {
    async *send({ messages, signal }) {
      /** @type {Response} */
      let response;

      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'text/event-stream', ...headers },
          body: JSON.stringify(body(messages)),
          signal,
        });
      } catch (error) {
        // fetch rejects with a TypeError when the network fails (offline, DNS, CORS); an abort
        // is a DOMException and passes through.
        if (!(error instanceof TypeError)) throw error;
        yield { type: 'error', message: error.message, code: 'network' };

        return;
      }

      if (!response.ok || !response.body) {
        // Frees the connection now rather than when the response is collected.
        response.body?.cancel().catch(() => {});
        yield { type: 'error', message: response.statusText || `HTTP ${response.status}`, code: 'http' };

        return;
      }

      for await (const chunk of chunks(response.body, maxText)) {
        if (signal.aborted) return;
        yield chunk;
      }
    },
  };
}
