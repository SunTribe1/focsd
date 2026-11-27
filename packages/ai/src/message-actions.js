import { css, html, nothing, svg } from 'lit';
import { FocsdElement } from '@focsd/primitives';
import { edgeIndex, defineElement, nextIndex } from '@focsd/primitives/internal';
import { announce } from '@focsd/primitives/utils';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import '@focsd/components/focsd-copy-button.js';
import './terms.js';

/** @typedef {'up' | 'down' | null} FeedbackValue */
/** `detail` of `focsd-retry`: the message id. @typedef {{ id: string }} RetryDetail */
/** `detail` of `focsd-feedback`: the message id and the feedback, null when it was taken back. @typedef {{ id: string, value: FeedbackValue }} FeedbackDetail */

const ACTIONS = ['copy', 'retry', 'feedback'];

/** Icon paths for rotate-ccw, thumbs-up and thumbs-down. From Lucide icons, ISC License, Copyright (c) 2026 Lucide Icons and Contributors (some derived from Feather, MIT, Copyright (c) 2013-present Cole Bemis); full text in LICENSE-lucide.txt in this package. */
const PATHS = {
  retry: ['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5'],
  up: [
    'M7 10v12',
    'M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z',
  ],
  down: [
    'M17 14V2',
    'M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z',
  ],
};

/** @param {keyof typeof PATHS} name */
const icon = (name) =>
  html`<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name].map((d) => svg`<path d=${d}></path>`)}</svg>`;

/** What is announced after each feedback value. */
const SAID = { up: 'ai.feedbackUp', down: 'ai.feedbackDown', none: 'ai.feedbackCleared' };

/**
 * The action names in `actions`, in their fixed order.
 * @param {string | string[]} actions
 */
const listed = (actions) => {
  const names = new Set((Array.isArray(actions) ? actions : String(actions ?? '').split(',')).map((a) => a.trim()));

  return ACTIONS.filter((a) => names.has(a));
};

/**
 * Message actions: a toolbar for one message with copy (`focsd-copy-button`), retry and thumbs
 * up/down. It is one tab stop; the arrow keys, Home and End move between the actions. The thumbs
 * are toggle buttons (`aria-pressed`) and what they change is announced.
 *
 * @fires {CustomEvent<RetryDetail>} focsd-retry - Retry was pressed. `detail.id` is the message id.
 * @fires {CustomEvent<FeedbackDetail>} focsd-feedback - Feedback changed. `detail` has `id` and `value` (`up`, `down` or null).
 * @csspart toolbar - The toolbar.
 * @csspart action - Each action (the copy button element and the native buttons).
 */
export class FocsdMessageActions extends FocsdElement {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdElement.styles,
    hostStyles,
    css`
      :host {
        display: block;
      }
      [part~='toolbar'] {
        display: flex;
        flex-wrap: wrap;
        gap: var(--focsd-space-1);
      }
      button[part~='action'] {
        display: inline-grid;
        place-items: center;
        box-sizing: border-box;
        min-inline-size: var(--focsd-control-height);
        min-block-size: var(--focsd-control-height);
        padding: 0;
        border: 0;
        border-radius: var(--focsd-radius-control);
        background: transparent;
        color: var(--focsd-ink-muted);
        font-size: 1.1rem;
        cursor: pointer;
      }
      button[part~='action']:hover {
        background: var(--focsd-surface-sunk);
        color: var(--focsd-ink);
      }
      button[aria-pressed='true'] {
        background: var(--focsd-surface-sunk);
        color: var(--focsd-action);
      }
      focsd-copy-button {
        color: var(--focsd-ink-muted);
      }
      @media (forced-colors: active) {
        button[aria-pressed='true'] {
          border: 2px solid Highlight;
        }
      }
    `,
  ];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    for: {},
    text: {},
    actions: {},
    feedback: {},
    _active: { state: true },
  };

  constructor() {
    super();
    /** The id of the message the actions are for (sent in the events). */
    this.for = '';
    /** The message's plain text, for copy. */
    this.text = '';
    /** @type {string | string[]} Which actions to show: any of `copy`, `retry`, `feedback` (comma-separated). */
    this.actions = 'copy,retry,feedback';
    /** @type {FeedbackValue} The current feedback. */
    this.feedback = null;
    /** @internal The action that holds the tab stop. */
    this._active = 0;
  }

  /** The controls in order: the copy button (it delegates focus to its own button) and the native buttons. */
  get #stops() {
    return /** @type {HTMLElement[]} */ ([...this.renderRoot.querySelectorAll('[part~="action"]')]);
  }

  /** @override */
  updated() {
    this.#syncStops();
  }

  #syncStops() {
    const stops = this.#stops;
    const active = Math.min(this._active, stops.length - 1);

    stops.forEach((s, i) => s.setAttribute('tabindex', i === active ? '0' : '-1'));
  }

  /** @param {FocusEvent} event */
  #onFocusIn(event) {
    const index = this.#stops.findIndex((s) => event.composedPath().includes(s));

    if (index >= 0 && index !== this._active) {
      this._active = index;
      this.#syncStops();
    }
  }

  /** @param {KeyboardEvent} event */
  #onKeyDown(event) {
    const stops = this.#stops;
    const current = stops.findIndex((s) => event.composedPath().includes(s));
    const rtl = getComputedStyle(this).direction === 'rtl';
    const none = () => false;

    /** @type {Record<string, () => number>} */
    const moves = {
      [rtl ? 'ArrowLeft' : 'ArrowRight']: () => nextIndex(current, 1, stops.length, none),
      [rtl ? 'ArrowRight' : 'ArrowLeft']: () => nextIndex(current, -1, stops.length, none),
      Home: () => edgeIndex('first', stops.length, none),
      End: () => edgeIndex('last', stops.length, none),
    };

    const move = moves[event.key];

    if (current < 0 || !move) return;
    event.preventDefault();
    this._active = move();
    this.#syncStops();
    stops[this._active]?.focus();
  }

  /** @param {'up' | 'down'} value */
  #setFeedback(value) {
    const next = this.feedback === value ? null : value;

    this.feedback = next;
    announce(this.localize.term(SAID[next ?? 'none']), { from: this });
    /** @type {FeedbackDetail} */
    const detail = { id: this.for, value: next };

    this.dispatchEvent(new CustomEvent('focsd-feedback', { bubbles: true, detail }));
  }

  #retry() {
    /** @type {RetryDetail} */
    const detail = { id: this.for };

    this.dispatchEvent(new CustomEvent('focsd-retry', { bubbles: true, detail }));
  }

  /** @param {'up' | 'down'} value */
  #thumb(value) {
    return html`<button
      part="action"
      type="button"
      aria-label=${this.localize.term(value === 'up' ? 'ai.goodResponse' : 'ai.badResponse')}
      aria-pressed=${String(this.feedback === value)}
      @click=${() => this.#setFeedback(value)}
    >${icon(value)}</button>`;
  }

  /** @override */
  render() {
    const shown = listed(this.actions);
    const t = (/** @type {string} */ key) => this.localize.term(key);

    return html`<div
      part="toolbar"
      role="toolbar"
      aria-label=${t('ai.messageActions')}
      @keydown=${this.#onKeyDown}
      @focusin=${this.#onFocusIn}
    >
      ${shown.includes('copy') ? html`<focsd-copy-button part="action" .value=${this.text ?? ''} label=${t('ai.copy')}></focsd-copy-button>` : nothing}
      ${
        shown.includes('retry')
          ? html`<button part="action" type="button" aria-label=${t('ai.retry')} @click=${this.#retry}>${icon('retry')}</button>`
          : nothing
      }
      ${shown.includes('feedback') ? html`${this.#thumb('up')}${this.#thumb('down')}` : nothing}
    </div>`;
  }
}

defineElement('focsd-message-actions', FocsdMessageActions);
