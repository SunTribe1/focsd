import { html, nothing } from 'lit';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import { FocsdElement } from '../internal/focsd-element.js';
import { deepActiveElement } from '../internal/focus.js';
import { composedContains, firstFocusable, focusWithin } from '../internal/popup.js';

/**
 * Loading overlay: covers its content with a spinner and makes the content inert while `active`.
 * The region is marked `aria-busy`, and "Loading" / "Loaded" are announced in a polite status
 * region. Focus inside the content moves to the overlay while loading (whose name then says
 * "Loading", so the status stays quiet) and comes back when it ends (to the first focusable element
 * in the content if the focused one is gone); focus elsewhere on the page is left alone. Only real
 * changes of `active` announce or move focus: an overlay active on first render does neither.
 *
 * Show it from your code with `active`, or wrap the work: `overlay.run(save)` shows the overlay
 * until `save()` settles. With `busy-on-submit`, a form inside that submits (and is not stopped by
 * a script) turns the overlay on by itself, for forms that post to the server; it turns off when
 * the page is shown again.
 *
 * @slot - The content to cover.
 * @slot indicator - Replaces the spinner: an image, an animation or a progress bar.
 * @slot label - Replaces the text under the indicator; plain text is also announced. Or set `label`.
 * @csspart region - The wrapper around the content; `inert` and `aria-busy` while active.
 * @csspart overlay - The cover shown while active; it takes focus from the content.
 * @csspart spinner - The spinner in the overlay.
 * @csspart text - The visible text in the overlay (`label`, or "Loading").
 * @csspart status - The visually hidden status region that announces loading and loaded.
 */
export class FocsdLoadingOverlayBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    active: { type: Boolean, reflect: true },
    label: {},
    busyOnSubmit: { type: Boolean, attribute: 'busy-on-submit', reflect: true },
  };

  /** The spinner element rendered in the overlay. */
  static spinnerTag = 'focsd-spinner';

  /** The element that had focus inside the content when loading began. @type {HTMLElement | null} */
  #returnTo = null;

  /** Whether focus was inside the content when loading began, so it is moved and brought back. */
  #hadFocus = false;

  #frame = 0;

  /** The text in the status region. */
  #status = '';

  constructor() {
    super();
    /** Whether the overlay is showing. */
    this.active = false;
    /** What is shown and announced while loading; defaults to "Loading". */
    this.label = '';
    /** Show the overlay when a form inside it submits (and nothing stopped the submit). */
    this.busyOnSubmit = false;
    this.addEventListener('submit', this.#onSubmit);
  }

  /**
   * Show the overlay while `task` runs: a function (called) or a promise. Resolves with its result;
   * the overlay goes away when it settles, also on failure.
   * @template T
   * @param {(() => T | Promise<T>) | Promise<T>} task
   * @returns {Promise<T>}
   */
  async run(task) {
    this.active = true;

    try {
      // A promise (a thenable) is awaited as it is; anything else is the task to start.
      return await ('then' in task ? task : task());
    } finally {
      this.active = false;
    }
  }

  /** `busy-on-submit`: a submit from inside turns the overlay on, after every handler had its say. */
  #onSubmit = (/** @type {SubmitEvent} */ event) => {
    if (!this.busyOnSubmit) return;
    // The submit bubbles here before the page's own listeners on outer elements: decide after them.
    setTimeout(() => {
      if (!event.defaultPrevented) this.active = true;
    });
  };

  /** Back from the browser's back-forward cache after a submit: the work is done, hide the overlay. */
  #onPageShow = (/** @type {PageTransitionEvent} */ event) => {
    if (event.persisted && this.busyOnSubmit) this.active = false;
  };

  /** @override */
  connectedCallback() {
    super.connectedCallback();
    addEventListener('pageshow', this.#onPageShow);
  }

  /** The text shown under the indicator: slotted label text, else `label`, else "Loading". */
  get #labelText() {
    const slotted = this.querySelector(':scope > [slot="label"]')?.textContent?.trim();

    return slotted || this.label || this.localize.term('loading');
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    cancelAnimationFrame(this.#frame);
    removeEventListener('pageshow', this.#onPageShow);
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  willUpdate(changed) {
    // Only real state changes announce or move focus: an overlay active on first render does neither.
    if (!changed.has('active') || !this.hasUpdated) return;

    if (this.active) {
      const focused = deepActiveElement();

      this.#hadFocus = composedContains(this, focused);
      this.#returnTo = this.#hadFocus ? focused : null;

      // Focus moving to the overlay (a group named by its text) already says it; the status would repeat it.
      if (!this.#hadFocus) this.#say(this.#labelText);
    } else if (changed.get('active')) this.#say(this.localize.term('loaded'));
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    if (!changed.has('active') || !this.#hadFocus) return;

    if (this.active) {
      /** @type {HTMLElement | null} */ (this.renderRoot.querySelector('[part~="overlay"]'))?.focus();

      return;
    }

    if (changed.get('active')) this.#restoreFocus();
  }

  /** Focus the remembered element, or the first focusable in the content if it is gone. */
  #restoreFocus() {
    const target = this.#returnTo;

    this.#hadFocus = false;
    this.#returnTo = null;

    // Leave focus alone if it moved somewhere else on the page while loading.
    if (!this.#focusIsFree()) return;

    if (target?.isConnected && composedContains(this, target)) target.focus();

    if (focusWithin(this)) return;

    const slot = this.renderRoot.querySelector('slot');

    /** @type {HTMLElement | null} */ (slot && firstFocusable(slot))?.focus();
  }

  /** True when nothing outside this element has focus (focus was dropped with the overlay). */
  #focusIsFree() {
    const focused = deepActiveElement();

    return !focused || focused === document.body || composedContains(this, focused);
  }

  /**
   * Announce `text`: the region is cleared first and written on the next frame, so it is heard.
   * @param {string} text
   */
  #say(text) {
    this.#status = '';
    cancelAnimationFrame(this.#frame);
    this.#frame = requestAnimationFrame(() => {
      this.#status = text;
      this.requestUpdate();
    });
  }

  #renderOverlay() {
    const tag = unsafeStatic(/** @type {typeof FocsdLoadingOverlayBase} */ (this.constructor).spinnerTag);

    return html`<div part="overlay" tabindex="-1" role="group" aria-labelledby="text">
      <slot name="indicator">${staticHtml`<${tag} part="spinner" aria-hidden="true"></${tag}>`}</slot><span part="text" id="text"><slot name="label">${this.label || this.localize.term('loading')}</slot></span>
    </div>`;
  }

  /** @override */
  render() {
    return html`<div part="region" ?inert=${this.active} aria-busy=${this.active ? 'true' : nothing}><slot></slot></div>${this.active ? this.#renderOverlay() : nothing}<span part="status" role="status" class="focsd-visually-hidden">${this.#status}</span>`;
  }
}
