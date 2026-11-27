/**
 * Wires the "Ask the docs" launcher and panel (AskTheDocs.astro). On first open it loads @focsd-dev/ai and
 * /ask-index.json, then answers each question with a local transport that streams the reply from
 * search.js: no request leaves the page except the one for the index.
 */
import { answer } from './search.js';

/** The suggested prompts (spec 2026-11-25, section 2). */
const SUGGESTIONS = ['How do I build a form with validation?', 'Is there a data grid?', 'How do I theme it?', 'Does it work with React?'];

const INDEX_URL = '/ask-index.json';

/** Milliseconds between streamed words; none when the reader asked for reduced motion. */
const WORD_DELAY = 14;

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * @typedef {{ count: number, entries: import('../../lib/ask-index.js').AskEntry[] }} AskIndex
 * @typedef {import('@focsd-dev/ai').Chunk} Chunk
 * @typedef {import('@focsd-dev/ai').Message} Message
 */

/** @type {Promise<AskIndex> | null} */
let indexPromise = null;

/** The index, fetched once per page; a failed fetch is retried on the next question. */
function loadIndex() {
  indexPromise ??= fetch(INDEX_URL).then((response) => {
    if (!response.ok) throw new Error(`The docs index answered ${response.status}.`);

    return /** @type {Promise<AskIndex>} */ (response.json());
  });
  indexPromise.catch(() => {
    indexPromise = null;
  });

  return indexPromise;
}

/**
 * Resolves after `ms`, or early with false when `signal` aborts.
 * @param {number} ms
 * @param {AbortSignal} signal
 */
function wait(ms, signal) {
  if (signal.aborted) return Promise.resolve(false);

  if (ms <= 0) return Promise.resolve(true);

  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(!signal.aborted), ms);

    signal.addEventListener('abort', () => (clearTimeout(timer), resolve(false)), { once: true });
  });
}

/** @param {Message[]} messages */
const lastQuestion = (messages) =>
  messages
    .findLast((m) => m.role === 'user')
    ?.parts.map((p) => (p.type === 'text' ? p.text : ''))
    .join(' ') ?? '';

/**
 * A transport for createChat that answers from the docs index in the page.
 * @returns {import('@focsd-dev/ai').Transport}
 */
function docsTransport() {
  return {
    async *send({ messages, signal }) {
      /** @type {AskIndex} */
      let index;

      try {
        index = await loadIndex();
      } catch {
        yield /** @type {Chunk} */ ({
          type: 'error',
          message: 'The docs index did not load. Check your connection, then ask again.',
          code: 'network',
        });

        return;
      }

      const reply = answer(index.entries, lastQuestion(messages), { count: index.count });
      const delay = reducedMotion() ? 0 : WORD_DELAY;

      for (const delta of reply.text.match(/\S+\s*/g) ?? []) {
        if (!(await wait(delay, signal))) return;
        yield /** @type {Chunk} */ ({ type: 'text-delta', id: 'text', delta });
      }

      for (const source of reply.sources) yield /** @type {Chunk} */ ({ type: 'source', ...source });
      yield /** @type {Chunk} */ ({ type: 'finish', reason: 'stop' });
    },
  };
}

/**
 * The chat elements, created on first open so the AI kit loads only for people who use it.
 * @param {HTMLElement} body
 */
async function buildChat(body) {
  const { createChat } = await import('@focsd-dev/ai');
  const thread = document.createElement('focsd-chat-thread');
  const suggestions = document.createElement('focsd-prompt-suggestions');
  const composer = document.createElement('focsd-composer');

  thread.className = 'ask-thread';
  thread.label = 'Conversation with the docs';
  suggestions.className = 'ask-suggestions';
  suggestions.label = 'Try asking';
  suggestions.suggestions = SUGGESTIONS;
  composer.className = 'ask-composer';
  composer.label = 'Ask a question';
  composer.placeholder = 'Ask about a component or a guide';
  body.append(thread, suggestions, composer);

  const chat = createChat({ transport: docsTransport() });

  const ask = (/** @type {string} */ text) => {
    if (!text.trim()) return;
    suggestions.hidden = true;
    body.setAttribute('data-asked', '');
    chat.send(text);
  };

  thread.chat = chat;
  chat.subscribe(({ status }) => (composer.busy = status === 'streaming'));
  composer.addEventListener('focsd-submit', (event) => ask(/** @type {CustomEvent<{ text: string }>} */ (event).detail.text));
  composer.addEventListener('focsd-stop', () => chat.stop());
  suggestions.addEventListener('focsd-suggestion-select', (event) => {
    ask(/** @type {CustomEvent<{ text: string }>} */ (event).detail.text);
    composer.focus();
  });
  loadIndex().catch(() => {
    /* reported in the reply when someone asks */
  });

  return composer;
}

/**
 * The panel's entrance. Decoration only: if motion fails to load, the panel still opens.
 * @param {HTMLElement} panel
 */
function animateIn(panel) {
  if (reducedMotion()) return;
  import('motion')
    .then(({ animate }) => animate(panel, { opacity: [0, 1], y: [12, 0], scale: [0.98, 1] }, { duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }))
    .catch(() => {
      /* no animation */
    });
}

/**
 * Tells the reader the chat could not load, in place of the composer.
 * @param {HTMLElement} body
 */
function showLoadError(body) {
  if (body.querySelector('.ask-load-error')) return;
  const note = document.createElement('p');

  note.className = 'ask-load-error';
  note.setAttribute('role', 'alert');
  note.textContent = 'Ask the docs could not load. Check your connection, then close and reopen this panel.';
  body.append(note);
}

/**
 * Opens and closes the panel: the launcher shows the state with aria-expanded, Escape closes, and
 * focus returns to the launcher.
 * @param {HTMLElement} root The [data-ask] element.
 */
export function mountAsk(root) {
  const launcher = /** @type {HTMLButtonElement} */ (root.querySelector('[data-ask-launcher]'));
  const panel = /** @type {HTMLElement} */ (root.querySelector('.ask-panel'));
  const body = /** @type {HTMLElement} */ (root.querySelector('[data-ask-body]'));
  const close = /** @type {HTMLButtonElement} */ (root.querySelector('[data-ask-close]'));
  const minimize = /** @type {HTMLButtonElement} */ (root.querySelector('[data-ask-minimize]'));
  /** @type {Promise<HTMLElement> | null} */
  let composer = null;

  const isOpen = () => !panel.hidden;

  const open = async () => {
    panel.hidden = false;
    launcher.setAttribute('aria-expanded', 'true');
    root.setAttribute('data-open', '');

    animateIn(panel);

    composer ??= buildChat(body);

    try {
      (await composer).focus();
      body.querySelector('.ask-load-error')?.remove();
    } catch {
      // The chat failed to load (offline, or a new deploy replaced the files): say so, and try again on the next open.
      composer = null;
      showLoadError(body);
    }
  };

  const hide = ({ restoreFocus = true } = {}) => {
    if (!isOpen()) return;
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    root.removeAttribute('data-open');

    if (restoreFocus) launcher.focus();
  };

  /** Close ends the conversation: the chat elements go, and the next open starts fresh. */
  const end = () => {
    hide();

    for (const el of body.querySelectorAll('.ask-thread, .ask-suggestions, .ask-composer, .ask-load-error')) el.remove();
    body.removeAttribute('data-asked');
    composer = null;
  };

  launcher.addEventListener('click', () => (isOpen() ? hide() : open()));
  minimize.addEventListener('click', () => hide());
  close.addEventListener('click', end);
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen() && !event.defaultPrevented) {
      event.preventDefault();
      hide();
    }
  });
}
