import { css, html } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { FocsdElement } from '@focsd-dev/primitives';
import { FOCUSABLE, defineElement } from '@focsd-dev/primitives/internal';
import { announce } from '@focsd-dev/primitives/utils';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { plainText } from './markdown/index.js';
import { errorText } from './error-text.js';
import { relay } from './relay.js';
import './chat-message.js';
import './terms.js';

/**
 * @typedef {import('./chat/types.js').Message} Message
 * @typedef {import('./message-actions.js').RetryDetail} RetryDetail
 * @typedef {import('./message-actions.js').FeedbackDetail} FeedbackDetail
 * @typedef {import('./chat/controller.js').Chat} Chat
 * @typedef {import('./chat-message.js').FocsdChatMessage} FocsdChatMessage
 */

/** Announced replies are cut to this many characters (R4). */
const ANNOUNCE_MAX = 300;

/**
 * `text` cut to at most `max` characters at the last word boundary (mid-word only when one word
 * is longer than that), so a screen reader never reads half a word.
 * @param {string} text
 * @param {number} max
 */
export function cutAtWord(text, max) {
  if (text.length <= max) return text;
  const head = text.slice(0, max + 1);
  const space = head.search(/\s\S*$/);

  return (space > 0 ? head.slice(0, space) : text.slice(0, max)).trimEnd();
}

/** Within this many pixels of the bottom counts as "at the bottom". */
const BOTTOM_SLACK = 24;

/** @param {Message['status'] | undefined} status */
const isBusy = (status) => status === 'pending' || status === 'streaming';

/**
 * Chat thread: the conversation as an APG feed (`role="feed"`) of `focsd-chat-message` articles. With no
 * message yet it is a named group, because a feed must hold articles.
 * Give it a chat controller (`chat`, from `createChat`) or a `messages` list.
 *
 * - Screen readers hear one announcement per finished reply ("Assistant replied: …", cut at the
 *   last word before 300 characters), "Response stopped" when stopped and the error (assertive) when it failed; never
 *   each token. There is no live region on the feed itself.
 * - It follows new content only while the reader is at the bottom. Scrolled up, a "Jump to latest"
 *   button appears; it scrolls down and moves focus to the latest message.
 * - Page Down and Page Up move focus to the next and previous message, and Ctrl+Home and Ctrl+End
 *   leave the feed for the element before or after it (APG feed keys). The last focused message (at
 *   first the latest) is the feed's one tab stop.
 * - Retry and feedback from a message's actions are passed on as `focsd-retry` and
 *   `focsd-feedback`. With a `chat`, retry calls `chat.retry(id)` unless a listener cancels the event.
 *
 * @fires {CustomEvent<RetryDetail>} focsd-retry - Retry was pressed on a message. `detail.id` is its id. Cancel it to stop the thread retrying through `chat`.
 * @fires {CustomEvent<FeedbackDetail>} focsd-feedback - Feedback changed on a message. `detail` has `id` and `value`.
 * @csspart feed - The feed (the scroll container).
 * @csspart jump - The "Jump to latest" button.
 * @cssprop --focsd-chat-thread-height - The thread's height (default `100%`); the feed scrolls inside it.
 */
export class FocsdChatThread extends FocsdElement {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdElement.styles,
    hostStyles,
    css`
      :host {
        position: relative;
        display: grid;
        block-size: var(--focsd-chat-thread-height, 100%);
        min-block-size: 0;
      }
      [part~='feed'] {
        display: flex;
        flex-direction: column;
        gap: var(--focsd-space-3);
        min-block-size: 0;
        padding: var(--focsd-space-3);
        overflow-y: auto;
        overscroll-behavior: contain;
      }
      [part~='feed']:focus-visible {
        outline: 2px solid transparent;
        box-shadow: var(--focsd-focus-ring-inset);
      }
      [part~='jump'] {
        position: absolute;
        inset-block-end: var(--focsd-space-3);
        inset-inline-start: 50%;
        translate: -50% 0;
        min-block-size: var(--focsd-control-height);
        padding-inline: var(--focsd-space-4);
        border: var(--focsd-border-width) solid var(--focsd-edge);
        border-radius: 999px;
        background: var(--focsd-surface-raised, var(--focsd-surface));
        color: var(--focsd-ink);
        font: inherit;
        font-size: var(--focsd-text-small-size);
        box-shadow: var(--focsd-shadow-overlay);
        cursor: pointer;
      }
      :host(:dir(rtl)) [part~='jump'] {
        translate: 50% 0;
      }
      [part~='jump'][hidden] {
        display: none;
      }
    `,
  ];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    chat: { attribute: false },
    messages: { attribute: false },
    label: {},
    _pinned: { state: true },
    _active: { state: true },
  };

  /** @type {(() => void) | null} */
  #unsubscribe = null;

  /** The status each message had at the last update, to tell when a reply finishes. */
  /** @type {Map<string, Message['status']>} */
  #seen = new Map();

  /** @type {ResizeObserver | null} */
  #resize = null;

  constructor() {
    super();
    /** @type {Chat | null} A chat controller (`createChat`); the thread shows and follows its messages. */
    this.chat = null;
    /** @type {Message[]} The messages, when there is no `chat` (set from it otherwise). */
    this.messages = [];
    /** The feed's accessible name; defaults to "Conversation". */
    this.label = '';
    /** @internal Whether the view follows new content (the reader is at the bottom). */
    this._pinned = true;
    /** @internal The id of the message that is the tab stop; '' means the latest. */
    this._active = '';
  }

  /**
   * Passes an event from a message on from this element (events do not cross shadow roots).
   * @param {Event} event
   * @returns {boolean} false when a listener canceled it
   */
  #relay(event) {
    return relay(this, event);
  }

  /** @param {Event} event */
  #onRetry(event) {
    const { id } = /** @type {CustomEvent<{ id: string }>} */ (event).detail;

    if (this.#relay(event)) this.chat?.retry(id);
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
    this.#follow();
    // Moved or re-attached: disconnectedCallback stopped watching the feed.

    if (this.hasUpdated) this.#observe();
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#resize?.disconnect();
  }

  /** Subscribes to the current chat (only while connected). */
  #follow() {
    this.#unsubscribe?.();
    this.#unsubscribe = null;

    const chat = this.chat;

    if (!chat || !this.isConnected) return;
    this.messages = chat.messages;
    this.#unsubscribe = chat.subscribe((state) => {
      this.messages = state.messages;
    });
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  willUpdate(changed) {
    if (changed.has('chat')) this.#follow();

    if (changed.has('messages')) this.#announceFinished();
  }

  /** Announces each reply that finished since the last update (R4). */
  #announceFinished() {
    const list = this.messages ?? [];

    for (const m of list) {
      const was = this.#seen.get(m.id);

      if (isBusy(was) && !isBusy(m.status)) this.#announce(m);

      // The person sent a message: show it and the reply, even if they had scrolled up.
      if (was === undefined && m.role === 'user') this._pinned = true;
    }

    this.#seen = new Map(list.map((m) => [m.id, m.status]));
  }

  /** @param {Message} m */
  #announce(m) {
    const t = this.localize;

    if (m.status === 'stopped') announce(t.term('ai.responseStopped'), { from: this });
    else if (m.status === 'error') announce(errorText(t, m), { politeness: 'assertive', from: this });
    else if (m.role === 'assistant') {
      const text = m.parts
        .flatMap((p) => (p.type === 'text' ? [plainText(p.text)] : []))
        .join(' ')
        .replaceAll(/\s+/g, ' ')
        .trim();

      const cut = text.length > ANNOUNCE_MAX ? `${cutAtWord(text, ANNOUNCE_MAX)}… ${t.term('ai.messageContinues')}` : text;

      announce(text ? t.term('ai.assistantReplied', cut) : t.term('ai.assistantRepliedWithoutText'), { from: this });
    }
  }

  get #feed() {
    return /** @type {HTMLElement | null} */ (this.renderRoot.querySelector('[part~="feed"]'));
  }

  /** @override */
  firstUpdated() {
    this.#observe();
  }

  /** Follows the feed's size: messages grow after the thread renders (streaming text fills in on its own update). */
  #observe() {
    const feed = this.#feed;

    if (!feed || typeof ResizeObserver === 'undefined') return;
    this.#resize ??= new ResizeObserver(() => this.#stick());
    this.#resize.observe(feed);

    for (const m of this.renderRoot.querySelectorAll('focsd-chat-message')) this.#resize.observe(m);
  }

  /** @override */
  updated() {
    this.#stick();

    for (const m of this.renderRoot.querySelectorAll('focsd-chat-message')) this.#resize?.observe(m);
  }

  /** Scrolls to the bottom while the reader is there. */
  #stick() {
    const feed = this.#feed;

    if (feed && this._pinned) feed.scrollTop = feed.scrollHeight;
  }

  #onScroll() {
    const feed = /** @type {HTMLElement} */ (this.#feed);

    this._pinned = feed.scrollHeight - feed.scrollTop - feed.clientHeight <= BOTTOM_SLACK;
  }

  /** @returns {FocsdChatMessage[]} */
  get #items() {
    return /** @type {FocsdChatMessage[]} */ ([...this.renderRoot.querySelectorAll('focsd-chat-message')]);
  }

  /** @param {Event} event */
  #itemOf(event) {
    return this.#items.findIndex((m) => event.composedPath().includes(m));
  }

  /** @param {FocusEvent} event */
  #onFocusIn(event) {
    const item = this.#items[this.#itemOf(event)];

    if (item?.message) this._active = item.message.id;
  }

  /**
   * Leaves the feed, as the APG feed pattern does: to the focusable element before the thread
   * (Ctrl+Home) or after it (Ctrl+End), in page order, looking into open shadow roots.
   * @param {boolean} forward
   */
  #leave(forward) {
    // Tab stops, and components that pass focus to an inner control (delegatesFocus, as the composer does).
    const takesFocus = (/** @type {Element} */ el) =>
      (el.matches(FOCUSABLE) || Boolean(el.shadowRoot?.delegatesFocus)) && el instanceof HTMLElement && el.checkVisibility?.() !== false;

    /** @type {Element[]} */
    const order = [];

    const walk = (/** @type {Document | ShadowRoot} */ root) => {
      for (const el of root.querySelectorAll('*')) {
        if (el === this || (!this.contains(el) && takesFocus(el))) order.push(el);

        if (el !== this && el.shadowRoot && !el.shadowRoot.delegatesFocus) walk(el.shadowRoot);
      }
    };

    walk(this.ownerDocument);
    const at = order.indexOf(this);
    const target = forward ? order[at + 1] : order[at - 1];

    if (at >= 0 && target) /** @type {HTMLElement} */ (target).focus();
  }

  /** @param {KeyboardEvent} event */
  #onKeyDown(event) {
    if ((event.ctrlKey || event.metaKey) && (event.key === 'Home' || event.key === 'End') && this.#itemOf(event) >= 0) {
      event.preventDefault();
      this.#leave(event.key === 'End');

      return;
    }

    const step = event.key === 'PageDown' ? 1 : event.key === 'PageUp' ? -1 : 0;
    const index = this.#itemOf(event);
    const target = this.#items[index + step];

    if (!step || index < 0 || !target) return;
    event.preventDefault();
    this._active = target.message?.id ?? '';
    target.focus();
  }

  async #jump() {
    const items = this.#items;
    const latest = items.at(-1);

    this._pinned = true;
    this._active = '';
    await this.updateComplete;
    this.#stick();
    latest?.focus();
  }

  /** @override */
  render() {
    const list = this.messages ?? [];
    // A feed must hold articles (axe: aria-required-children), so an empty thread is a named group.
    const active = list.some((m) => m.id === this._active) ? this._active : list.at(-1)?.id;

    return html`<div
        part="feed"
        role=${list.length ? 'feed' : 'group'}
        aria-label=${this.label || this.localize.term('ai.conversation')}
        @scroll=${this.#onScroll}
        @keydown=${this.#onKeyDown}
        @focusin=${this.#onFocusIn}
        @focsd-retry=${this.#onRetry}
        @focsd-feedback=${this.#relay}
      >
        ${repeat(
          list,
          (m) => m.id,
          (m, i) =>
            html`<focsd-chat-message .message=${m} .posinset=${i + 1} .setsize=${list.length} .tabStop=${m.id === active}></focsd-chat-message>`,
        )}
      </div>
      <button part="jump" type="button" ?hidden=${this._pinned} @click=${this.#jump}>${this.localize.term('ai.jumpToLatest')}</button>`;
  }
}

defineElement('focsd-chat-thread', FocsdChatThread);
