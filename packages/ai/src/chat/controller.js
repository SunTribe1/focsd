// The chat controller: a message list driven by a pluggable transport. State is immutable (every
// update makes a new `messages` array and a new message object) and incoming chunks are applied
// once per animation frame, so a burst of 200 tokens is one update and one render.
import { applyChunk } from './apply.js';

/**
 * @typedef {import('./types.js').Message} Message
 * @typedef {import('./types.js').Chunk} Chunk
 * @typedef {import('./types.js').Transport} Transport
 * @typedef {import('./types.js').FileRef} FileRef
 * @typedef {import('./types.js').ChatState} ChatState
 * @typedef {import('./types.js').ChatStatus} ChatStatus
 * @typedef {(fn: () => void) => unknown} Schedule
 * @typedef {{ transport: Transport, messages?: Message[], onChange?: (state: ChatState) => void, schedule?: Schedule }} ChatOptions
 * @typedef {{
 *   readonly messages: Message[],
 *   readonly status: ChatStatus,
 *   send(text: string, files?: FileRef[]): Promise<void>,
 *   stop(): void,
 *   retry(messageId: string): Promise<void>,
 *   setMessages(list: Message[]): void,
 *   subscribe(fn: (state: ChatState) => void): () => void,
 * }} Chat
 */

/** @type {Schedule} */
const nextFrame = (fn) => ('requestAnimationFrame' in globalThis ? requestAnimationFrame(fn) : setTimeout(fn, 16));

let counter = 0;

/** A unique message id. */
const newId = () => globalThis.crypto?.randomUUID?.() ?? `m${Date.now().toString(36)}${(counter++).toString(36)}`;

/**
 * @param {Message['role']} role
 * @param {Message['status']} status
 * @param {Message['parts']} parts
 * @returns {Message}
 */
const message = (role, status, parts) => ({ id: newId(), role, status, parts, createdAt: Date.now() });

/**
 * The final form of a message when its run ends; a message a chunk already failed keeps its error.
 * @param {Message} m
 * @param {'done' | 'stopped' | 'error'} status
 * @returns {Message}
 */
const settled = (m, status) => (m.status === 'error' ? m : { ...m, status });

/**
 * The most one reply may hold, counted over every chunk type: the JSON length of each chunk, plus
 * `PART` for each one that starts a part. Past it the reply ends with a `too-large` error.
 */
const MAX_SIZE = 2 ** 21;

/** @type {Chunk} The chunk that ends a reply whose line, event or total size passed a cap. */
const TOO_LARGE = { type: 'error', message: 'The response was too large.', code: 'too-large' };

/** What each new part (and each tool result) adds, so a stream of tiny parts stops at ~500. */
const PART = 2 ** 12;

/** The JSON length of a chunk (0 when JSON cannot hold it: a scripted cycle or BigInt). */
function sizeOf(/** @type {Chunk} */ chunk) {
  try {
    return JSON.stringify(chunk).length;
  } catch {
    return 0;
  }
}

/** @typedef {{ id: string, abort: AbortController, buffer: Chunk[], scheduled: boolean, size: number, last?: string }} Run */

/** @implements {Chat} */
class ChatController {
  /** @type {ChatState} */
  #state;
  /** @type {Set<(state: ChatState) => void>} */
  #listeners = new Set();
  /** @type {Run | null} */
  #run = null;
  #transport;
  #onChange;
  #schedule;

  /** @param {ChatOptions} options */
  constructor({ transport, messages = [], onChange, schedule = nextFrame }) {
    this.#state = { messages: [...messages], status: 'idle' };
    this.#transport = transport;
    this.#onChange = onChange;
    this.#schedule = schedule;
  }

  /** The messages: read-only (never change them in place; use send, retry or setMessages). */
  get messages() {
    return this.#state.messages;
  }

  get status() {
    return this.#state.status;
  }

  /**
   * Sends a user message (with optional file parts) and streams the reply. Ignored while a reply
   * is streaming.
   * @param {string} text
   * @param {FileRef[]} [files]
   */
  send(text, files = []) {
    /** @type {Message['parts']} */
    const parts = [{ type: 'text', text }, ...files.map((f) => ({ ...f, type: /** @type {const} */ ('file') }))];

    return this.#run ? Promise.resolve() : this.#ask([...this.#state.messages, message('user', 'done', parts)]);
  }

  /** Aborts the streaming reply and marks it stopped. */
  stop() {
    this.#end('stopped');
  }

  /**
   * Aborts the transport and ends the current run.
   * @param {'done' | 'stopped' | 'error'} status
   */
  #end(status) {
    this.#run?.abort.abort();
    this.#settle(status);
  }

  /**
   * Asks again: an assistant reply is replaced (asked from the history before it); for a user
   * message, everything after it is dropped and it is asked again.
   * @param {string} messageId
   */
  retry(messageId) {
    const list = this.#state.messages;
    const index = list.findIndex((m) => m.id === messageId);

    if (index < 0) return Promise.resolve();

    this.stop();

    return this.#ask(this.#state.messages.slice(0, list[index]?.role === 'user' ? index + 1 : index));
  }

  /** @param {Message[]} list */
  setMessages(list) {
    this.stop();
    this.#set({ messages: [...list], status: 'idle' });
  }

  /** @param {(state: ChatState) => void} fn */
  subscribe(fn) {
    this.#listeners.add(fn);

    return () => {
      this.#listeners.delete(fn);
    };
  }

  /** @param {Partial<ChatState>} next */
  #set(next) {
    this.#state = { ...this.#state, ...next };
    this.#onChange?.(this.#state);

    for (const fn of this.#listeners) fn(this.#state);
  }

  /** @param {string} id @param {(m: Message) => Message} fn */
  #update(id, fn) {
    this.#set({ messages: this.#state.messages.map((m) => (m.id === id ? fn(m) : m)) });
  }

  /** Applies the buffered chunks of the current run in one update. */
  #flush() {
    const run = this.#run;

    if (!run?.buffer.length) return;

    const chunks = run.buffer;

    run.buffer = [];
    run.scheduled = false;
    this.#update(run.id, (m) => chunks.reduce(applyChunk, m));
  }

  /**
   * Buffers a chunk for the next frame. `finish` ends the run (a server that keeps the stream
   * open after it does not leave the reply streaming), and a reply past `MAX_SIZE` ends with a
   * `too-large` error.
   * @param {Chunk} chunk
   */
  #receive(chunk) {
    const run = /** @type {Run} */ (this.#run);
    const { type } = chunk;

    // A delta that extends the last part adds no part.
    run.size += sizeOf(chunk) + (type === run.last && 'delta' in chunk ? 0 : PART);
    run.last = type;

    const over = run.size > MAX_SIZE && type !== 'finish';

    run.buffer.push(over ? TOO_LARGE : chunk);

    // `finish` ends the run here: a server may keep the stream open after it.
    if (over || type === 'finish') this.#end(over ? 'error' : 'done');
    else if (!run.scheduled) {
      run.scheduled = true;
      this.#schedule(() => {
        if (this.#run === run) this.#flush();
      });
    }
  }

  /**
   * Ends the current run with a final status.
   * @param {'done' | 'stopped' | 'error'} status
   */
  #settle(status) {
    const run = this.#run;

    if (!run) return;

    this.#flush();
    this.#run = null;
    let failed = false;

    this.#update(run.id, (m) => {
      const next = settled(m, status);

      failed = next.status === 'error';

      return next;
    });
    this.#set({ status: failed ? 'error' : 'idle' });
  }

  /**
   * Streams a reply to `history` into a new assistant message.
   * @param {Message[]} history
   */
  async #ask(history) {
    const reply = message('assistant', 'pending', []);
    /** @type {Run} */
    const run = { id: reply.id, abort: new AbortController(), buffer: [], scheduled: false, size: 0 };

    this.#run = run;
    this.#set({ messages: [...history, reply], status: 'streaming' });

    try {
      for await (const chunk of this.#transport.send({ messages: history, signal: run.abort.signal })) {
        if (this.#run !== run) return;
        this.#receive(chunk);
      }

      if (this.#run === run) this.#settle('done');
    } catch (error) {
      if (this.#run !== run) return;
      // A RangeError is a reader's size cap (`parseSse`); anything else keeps its own text.
      run.buffer.push(
        error instanceof RangeError ? TOO_LARGE : { type: 'error', message: String(/** @type {any} */ (error)?.message ?? error) },
      );
      this.#settle('error');
    }
  }
}

/**
 * Creates a chat over a transport. State is immutable: each update makes a new `messages` array
 * and a new message object; chunks are applied once per animation frame.
 * @param {ChatOptions} options
 * @returns {Chat}
 */
export const createChat = (options) => new ChatController(options);
