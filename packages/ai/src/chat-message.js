import { css, html, nothing } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { FocsdElement } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { formatBytes } from '@focsd-dev/primitives/utils';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { plainText } from './markdown/index.js';
import { errorText } from './error-text.js';
import { relay } from './relay.js';
import './streaming-text.js';
import './reasoning.js';
import './tool-call.js';
import './source-chip.js';
import './message-actions.js';
import './terms.js';

/**
 * @typedef {import('./chat/types.js').Message} Message
 * @typedef {import('./message-actions.js').RetryDetail} RetryDetail
 * @typedef {import('./message-actions.js').FeedbackDetail} FeedbackDetail
 * @typedef {import('./chat/types.js').Part} Part
 * @typedef {Extract<Part, { type: 'source' }>} SourcePart
 * @typedef {{ kind: 'part', part: Part, index: number } | { kind: 'sources', sources: SourcePart[], first: number, index: number }} Piece
 */

/** The author term for each role. */
const AUTHORS = { user: 'ai.you', assistant: 'ai.assistant', system: 'ai.system', tool: 'ai.tool' };

/**
 * The parts in order, with each run of consecutive sources as one numbered list (numbers count on
 * across runs).
 * @param {Part[]} parts
 * @returns {Piece[]}
 */
function pieces(parts) {
  /** @type {Piece[]} */
  const out = [];
  let count = 0;

  parts.forEach((part, index) => {
    const last = out.at(-1);

    if (part.type !== 'source') out.push({ kind: 'part', part, index });
    else if (last?.kind === 'sources') out[out.length - 1] = { ...last, sources: [...last.sources, part] };
    else out.push({ kind: 'sources', sources: [part], first: count + 1, index });

    if (part.type === 'source') count++;
  });

  return out;
}

/** @param {Message} m */
const isBusy = (m) => m.status === 'pending' || m.status === 'streaming';

/**
 * Chat message: one message as an `article`, named by its author ("You", "Assistant") and time. Its
 * parts render in order: text (markdown for replies, plain for the reader's own), reasoning, tool
 * calls, numbered sources and files. It is `aria-busy` while it streams. A finished reply gets
 * message actions (copy, retry, feedback), whose events it passes on. Usually rendered by
 * `focsd-chat-thread`.
 *
 * @fires {CustomEvent<RetryDetail>} focsd-retry - Retry was pressed in the message actions. `detail.id` is the message id.
 * @fires {CustomEvent<FeedbackDetail>} focsd-feedback - Feedback changed in the message actions. `detail` has `id` and `value`.
 * @csspart bubble - The article.
 * @csspart author - The author.
 * @csspart body - The parts.
 * @csspart meta - The time, and a note when the reply was stopped.
 */
export class FocsdChatMessage extends FocsdElement {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdElement.styles,
    hostStyles,
    css`
      :host {
        display: block;
      }
      [part~='bubble'] {
        display: grid;
        /* One column that may shrink below its content, so a wide code block scrolls instead of
           pushing the reply out of a narrow thread. */
        grid-template-columns: minmax(0, 1fr);
        gap: var(--focsd-space-2);
        max-inline-size: min(100%, 48rem);
        padding: var(--focsd-space-2) var(--focsd-space-3);
        border-radius: var(--focsd-radius-surface);
      }
      [part~='bubble']:focus-visible {
        outline: 2px solid transparent;
        box-shadow: var(--focsd-focus-ring);
      }
      :host([from='user']) [part~='bubble'] {
        /* The person's message hugs its text, up to most of the row. */
        inline-size: fit-content;
        margin-inline-start: auto;
        max-inline-size: min(85%, 40rem);
        background: var(--focsd-surface-sunk);
      }
      header {
        display: flex;
        flex-wrap: wrap;
        gap: var(--focsd-space-2);
        align-items: baseline;
      }
      [part~='author'] {
        font-weight: var(--focsd-text-label-weight);
        font-size: var(--focsd-text-small-size);
      }
      [part~='meta'] {
        color: var(--focsd-ink-muted);
        font-size: var(--focsd-text-small-size);
      }
      [part~='body'] {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: var(--focsd-space-2);
        min-inline-size: 0;
      }
      .sources {
        display: flex;
        flex-wrap: wrap;
        gap: var(--focsd-space-1) var(--focsd-space-3);
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .file {
        color: var(--focsd-ink-muted);
        font-size: var(--focsd-text-small-size);
      }
      .error {
        margin: 0;
        color: var(--focsd-critical);
      }
      @media (forced-colors: active) {
        :host([from='user']) [part~='bubble'] {
          border: 1px solid CanvasText;
        }
      }
    `,
  ];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    message: { attribute: false },
    from: { reflect: true },
    posinset: { type: Number },
    setsize: { type: Number },
    tabStop: { type: Boolean, attribute: 'tab-stop' },
  };

  constructor() {
    super();
    /** @type {Message | null} The message to show. */
    this.message = null;
    /** @type {Message['role'] | ''} The message's role, reflected for styling (set from `message`). */
    this.from = '';
    /** The message's position in the thread (1-based; 0 leaves it out). */
    this.posinset = 0;
    /** The number of messages in the thread (0 leaves it out). */
    this.setsize = 0;
    /** Whether the article is the thread's tab stop (`tabindex="0"`); otherwise it is focusable by script only. */
    this.tabStop = false;
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  willUpdate(changed) {
    if (changed.has('message')) this.from = this.message?.role ?? '';
  }

  /**
   * Focuses the article.
   * @override
   * @param {FocusOptions} [options]
   */
  focus(options) {
    /** @type {HTMLElement | null} */ (this.renderRoot.querySelector('article'))?.focus(options);
  }

  /**
   * Passes an event from the message actions on from this element: they do not cross shadow roots.
   * @param {Event} event
   */
  #relay(event) {
    relay(this, event);
  }

  /** @param {number | undefined} at */
  #time(at) {
    if (!at) return null;

    const date = new Date(at);

    if (Number.isNaN(date.getTime())) return null;

    return {
      iso: date.toISOString(),
      text: new Intl.DateTimeFormat(this.localize.locale(), { hour: 'numeric', minute: '2-digit' }).format(date),
    };
  }

  /**
   * @param {Part} part
   * @param {boolean} streaming whether this part is the one streaming
   * @param {Message['role']} role
   */
  #part(part, streaming, role) {
    switch (part.type) {
      case 'text':
        return html`<focsd-streaming-text .text=${part.text} .plain=${role === 'user'} .streaming=${streaming}></focsd-streaming-text>`;
      case 'reasoning':
        return html`<focsd-reasoning .text=${part.text} .streaming=${streaming}></focsd-reasoning>`;
      case 'tool-call':
        return html`<focsd-tool-call .name=${part.name} .status=${part.status} .input=${part.input} .output=${part.output}></focsd-tool-call>`;
      case 'file':
        return html`<span class="file">${part.name} · ${formatBytes(part.size)}</span>`;
      default:
        return nothing;
    }
  }

  /** @param {Message} m */
  #body(m) {
    const busy = isBusy(m);
    const lastIndex = m.parts.length - 1;

    const content = repeat(
      pieces(m.parts),
      (p) => p.index,
      (p) =>
        p.kind === 'sources'
          ? html`<ul class="sources" aria-label=${this.localize.term('ai.sources')}>
              ${p.sources.map(
                (s, i) => html`<li><focsd-source-chip .href=${s.url} .label=${s.title} .index=${p.first + i}></focsd-source-chip></li>`,
              )}
            </ul>`
          : this.#part(p.part, busy && p.index === lastIndex, m.role),
    );

    const caretOnly = busy && m.parts.length === 0 ? html`<focsd-streaming-text .streaming=${true}></focsd-streaming-text>` : nothing;
    const error = m.status === 'error' ? html`<p class="error">${errorText(this.localize, m)}</p>` : nothing;

    return html`${content}${caretOnly}${error}`;
  }

  /** @param {Message} m */
  #actions(m) {
    if (m.role !== 'assistant' || isBusy(m)) return nothing;

    const text = m.parts.flatMap((p) => (p.type === 'text' ? [plainText(p.text)] : [])).join('\n\n');

    return html`<focsd-message-actions
      .for=${m.id}
      .text=${text}
      @focsd-retry=${this.#relay}
      @focsd-feedback=${this.#relay}
    ></focsd-message-actions>`;
  }

  /**
   * The time, and the "Response stopped" note.
   * @param {Message | null} m
   * @param {{ iso: string, text: string } | null} time
   */
  #meta(m, time) {
    const stopped = m?.status === 'stopped' ? html` · ${this.localize.term('ai.responseStopped')}` : nothing;

    return html`${time ? html`<time datetime=${time.iso}>${time.text}</time>` : nothing}${stopped}`;
  }

  /** @override */
  render() {
    const m = this.message;
    const role = m?.role ?? 'assistant';
    // Own keys only: a saved role such as "constructor" must not find an inherited value.
    const author = this.localize.term(Object.hasOwn(AUTHORS, role) ? AUTHORS[role] : 'ai.assistant');
    const time = this.#time(m?.createdAt);
    const position = (/** @type {number} */ n) => (n > 0 ? n : nothing);

    return html`<article
      part="bubble"
      tabindex=${this.tabStop ? '0' : '-1'}
      aria-label=${this.localize.term('ai.messageLabel', author, time?.text ?? '')}
      aria-busy=${m && isBusy(m) ? 'true' : nothing}
      aria-posinset=${position(this.posinset)}
      aria-setsize=${position(this.setsize)}
    >
      <header><span part="author">${author}</span> <span part="meta">${this.#meta(m, time)}</span></header>
      <div part="body">${m ? this.#body(m) : nothing}</div>
      ${m ? this.#actions(m) : nothing}
    </article>`;
  }
}

defineElement('focsd-chat-message', FocsdChatMessage);
