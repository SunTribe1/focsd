import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { HoverIntent } from '../internal/popup.js';

/** @typedef {import('../internal/types.js').BlockPlacement} BlockPlacement */

/** Grace period before hiding once the pointer and focus have left (WCAG 1.4.13 hoverable). */
const HIDE_GRACE = 200;

/**
 * Tooltip for a slotted trigger. Shows on hover (after `delay`) and focus, hides on Escape, blur and
 * pointer leave, stays while hovered (WCAG 1.4.13). The trigger gets aria-description = text.
 *
 * @slot - The element the tooltip describes.
 * @csspart tooltip - The tooltip element.
 */
export class FocsdTooltipBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { text: {}, placement: { reflect: true }, delay: { type: Number } };

  #intent = new HoverIntent(this, { show: () => this.show(), hide: () => this.hide() });

  constructor() {
    super();
    /** The tooltip text. */
    this.text = '';
    /** @type {BlockPlacement} Reflected for styling. The built-in style places the tooltip above the trigger. */
    this.placement = 'top';
    /** Milliseconds of hover before the tooltip shows. */
    this.delay = 400;
    this.addEventListener('pointerenter', () => {
      this.#intent.setHovered(true);
      this.#intent.showAfter(this.delay);
    });
    this.addEventListener('pointerleave', () => {
      this.#intent.setHovered(false);
      this.#intent.hideAfter(HIDE_GRACE);
    });
    this.addEventListener('focusin', () => {
      this.#intent.setFocused(true);
      this.show();
    });
    this.addEventListener('focusout', () => {
      this.#intent.setFocused(false);
      this.#intent.hideAfter(HIDE_GRACE);
    });
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
    // Capture phase, so the Escape is consumed before a sheet or dialog around the tooltip sees it.
    document.addEventListener('keydown', this.#onKeyDown, true);
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.#onKeyDown, true);
  }

  /** The element the tooltip describes. */
  get trigger() {
    return this.firstElementChild;
  }

  get #tip() {
    return this.renderRoot.querySelector('[part~="tooltip"]');
  }

  /** Show the tooltip now, skipping `delay`. */
  show() {
    this.#intent.cancel();
    const tip = this.#tip;

    if (tip && !tip.matches(':popover-open')) /** @type {HTMLElement} */ (tip).showPopover();
  }

  /** Hide the tooltip. */
  hide() {
    this.#intent.cancel();
    const tip = this.#tip;

    if (tip?.matches(':popover-open')) /** @type {HTMLElement} */ (tip).hidePopover();
  }

  /**
   * Escape dismisses only the tooltip (WCAG 1.4.13): the keydown is canceled so a sheet or dialog
   * around it stays open until the next Escape.
   */
  /** @param {KeyboardEvent} event */
  #onKeyDown = (event) => {
    if (event.key !== 'Escape' || !this.#tip?.matches(':popover-open')) return;
    event.preventDefault();
    this.hide();
  };

  #describe = () => {
    const trigger = this.trigger;

    if (!trigger) return;

    if ('description' in trigger) trigger.description = this.text;
    else if (this.text) trigger.setAttribute('aria-description', this.text);
    else trigger.removeAttribute('aria-description');
  };

  /** @override */
  updated() {
    this.#describe();
  }

  /** @override */
  render() {
    return html`<slot @slotchange=${this.#describe}></slot><div part="tooltip" role="tooltip" popover="manual" aria-hidden="true">${this.text}</div>`;
  }
}
