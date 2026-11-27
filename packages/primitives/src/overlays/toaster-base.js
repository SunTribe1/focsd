import { html, nothing } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { focusWithin } from '../internal/popup.js';
import { FocsdElement } from '../internal/focsd-element.js';
import { iconSvg } from '../internal/icons.js';

/**
 * Toast ids, shared by every toaster on the page. A plain counter, not `uid()`: `show()` returns
 * the id and `dismiss(id)` takes it, so ids are numbers by API, and one sequence keeps them unique
 * across toasters.
 */
let nextId = 0;

/** Default `duration` of a toast, in milliseconds. */
const DEFAULT_DURATION = 6000;

/** Least time a paused toast stays after hover and focus leave, so it does not vanish at once. */
const MIN_RESUME = 1000;

/** @typedef {{ label: string, onClick?: () => void }} ToastAction */
/** @typedef {{ message: string, tone?: string, action?: ToastAction, duration?: number }} ToastOptions */
/** @typedef {{ id: number, message: string, tone: string, action?: ToastAction }} Toast */
/** @typedef {{ remaining: number, startedAt: number, handle: number, holds?: Set<string>, paused?: boolean }} ToastTimer */

/**
 * Toast region: a polite role=status live region that exists before toasts arrive.
 * `show({ message, tone, action, duration })` returns an id; timers pause while hovered or focused.
 *
 * @csspart action - The action element.
 * @csspart dismiss - The dismiss element.
 * @csspart list - The list element.
 * @csspart message - The message element.
 * @csspart region - The region element.
 * @csspart toast - The toast element.
 */
export class FocsdToasterBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { placement: { reflect: true }, _toasts: { state: true } };

  /** @type {Map<number, ToastTimer>} */
  #timers = new Map();

  constructor() {
    super();
    /**
     * @type {'bottom-end' | 'bottom-start' | 'top-end' | 'top-start'}
     * Reflected for styling. The built-in style places toasts at the bottom end corner.
     */
    this.placement = 'bottom-end';
    /** @type {Toast[]} */
    this._toasts = [];
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();

    for (const t of this.#timers.values()) clearTimeout(t.handle);
    this.#timers.clear();
  }

  /**
   * Show a toast. Returns its id. `duration: 0` keeps it until dismissed.
   * @param {ToastOptions} options
   * @returns {number}
   */
  show({ message, tone = 'neutral', action, duration = DEFAULT_DURATION }) {
    nextId += 1;
    const id = nextId;
    this._toasts = [...this._toasts, { id, message, tone, action }];

    if (duration > 0) this.#start(id, duration);

    return id;
  }

  /**
   * Dismiss the toast with this id.
   * @param {number} id
   */
  dismiss(id) {
    const timer = this.#timers.get(id);

    if (timer) clearTimeout(timer.handle);
    this.#timers.delete(id);
    this._toasts = this._toasts.filter((t) => t.id !== id);
  }

  /**
   * @param {number} id
   * @param {number} remaining
   */
  #start(id, remaining) {
    this.#timers.set(id, { remaining, startedAt: Date.now(), handle: setTimeout(() => this.dismiss(id), remaining) });
  }

  /**
   * @param {number} id
   * @param {string} reason
   */
  #pause(id, reason) {
    const timer = this.#timers.get(id);

    if (!timer) return;
    timer.holds = new Set([...(timer.holds ?? []), reason]);

    if (timer.paused) return;
    clearTimeout(timer.handle);
    timer.remaining -= Date.now() - timer.startedAt;
    timer.paused = true;
  }

  /**
   * Resume only when neither hover nor focus is holding the toast open.
   * @param {number} id
   * @param {string} reason
   */
  #resume(id, reason) {
    const timer = this.#timers.get(id);

    if (!timer?.paused) return;
    timer.holds?.delete(reason);

    if (timer.holds?.size) return;
    const { holds } = timer;
    this.#start(id, Math.max(MIN_RESUME, timer.remaining));
    /** @type {ToastTimer} */ (this.#timers.get(id)).holds = holds;
  }

  /**
   * Dismiss from inside a toast: keep focus on the page (next toast, else the region).
   * @param {number} id
   */
  #dismissFromUser(id) {
    const hadFocus = focusWithin(this);
    const index = this._toasts.findIndex((t) => t.id === id);
    this.dismiss(id);

    if (!hadFocus) return;
    this.updateComplete.then(() => {
      const toasts = [...this.renderRoot.querySelectorAll('[part~="dismiss"]')];
      /** @type {HTMLElement} */ (toasts[Math.min(index, toasts.length - 1)] ?? this.renderRoot.querySelector('[part~="region"]'))?.focus();
    });
  }

  /** @override */
  render() {
    return html`<div part="region" role="status" tabindex="-1">
      <ol part="list">
        ${repeat(
          this._toasts,
          (t) => t.id,
          (t) => html`<li
          part="toast"
          data-tone=${t.tone}
          @pointerenter=${() => this.#pause(t.id, 'hover')}
          @pointerleave=${() => this.#resume(t.id, 'hover')}
          @focusin=${() => this.#pause(t.id, 'focus')}
          @focusout=${() => this.#resume(t.id, 'focus')}
        >
          <span part="message">${t.message}</span>
          ${
            t.action
              ? html`<button part="action" type="button" @click=${() => {
                  /** @type {ToastAction} */ (t.action).onClick?.();
                  this.#dismissFromUser(t.id);
                }}>${t.action.label}</button>`
              : nothing
          }
          <button part="dismiss" type="button" aria-label=${this.localize.term('dismissNotification')} @click=${() => this.#dismissFromUser(t.id)}>${iconSvg('x')}</button>
        </li>`,
        )}
      </ol>
    </div>`;
  }
}
