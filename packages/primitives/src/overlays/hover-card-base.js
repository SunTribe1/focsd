import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { HoverIntent, composedContains, firstFocusable, isFrom } from '../internal/popup.js';
import { uid } from '../internal/id.js';

/** @typedef {import('../internal/types.js').BlockPlacement} BlockPlacement */

const LONG_PRESS = 500;

/**
 * Hover card: a non-modal preview (a profile, a link preview) for a link or button. Opens on hover
 * after `open-delay` and on keyboard focus; stays open while the pointer or focus is on the trigger
 * or the card, and Escape dismisses it without moving focus (WCAG 1.4.13). The card sits right after
 * the trigger in focus order, so Tab moves into it. On touch, a tap follows the trigger and a long
 * press opens the card. Setting `open` opens or closes it at once. When the card holds something
 * to Tab to, the trigger says whether it is open (aria-expanded). Never put the only way to reach
 * something in a hover card.
 *
 * @fires {Event} focsd-open - Fired when the card opens.
 * @fires {Event} close - Fired when the card closes.
 * @slot trigger - The link or button the card previews.
 * @slot - The card content.
 * @csspart card - The card.
 */
export class FocsdHoverCardBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    placement: { reflect: true },
    openDelay: { type: Number, attribute: 'open-delay' },
    closeDelay: { type: Number, attribute: 'close-delay' },
    open: { type: Boolean, reflect: true },
  };

  #intent = new HoverIntent(this, { show: () => this.show(), hide: () => this.hide() });
  #pressTimer = 0;
  #suppressClick = false;
  /**
   * Content changes deep inside the card (a link added to a paragraph) fire no slotchange, but can
   * change the description and whether there is something to Tab to.
   */
  #observer = new MutationObserver(() => this.#describe());

  constructor() {
    super();
    /** @type {BlockPlacement} The side of the trigger the card shows on. */
    this.placement = 'bottom';
    /** Milliseconds of hover or focus before the card opens. */
    this.openDelay = 600;
    /** Milliseconds after the pointer or focus leaves before the card closes. */
    this.closeDelay = 300;
    /** Whether the card is open. */
    this.open = false;
    this.addEventListener('pointerenter', this.#onEnter);
    this.addEventListener('pointerleave', this.#onLeave);
    this.addEventListener('pointerdown', this.#onPointerDown);
    this.addEventListener('pointerup', this.#cancelPress);
    this.addEventListener('pointercancel', this.#cancelPress);
    this.addEventListener('click', this.#onClick, { capture: true });
    this.addEventListener('focusin', this.#onFocusIn);
    this.addEventListener('focusout', this.#onFocusOut);
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
    // Capture: the card handles Escape before a dialog or sheet around it does.
    document.addEventListener('keydown', this.#onKeyDown, true);
    document.addEventListener('pointerdown', this.#onDocumentPointerDown, true);
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['href', 'tabindex', 'disabled'],
    });
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#observer.disconnect();
    document.removeEventListener('keydown', this.#onKeyDown, true);
    document.removeEventListener('pointerdown', this.#onDocumentPointerDown, true);
    // The open and close delays are dropped by #intent itself (a controller) on disconnect.
    clearTimeout(this.#pressTimer);
  }

  /** The slotted trigger element. */
  get trigger() {
    return this.querySelector(':scope > [slot="trigger"]');
  }

  get #card() {
    return this.renderRoot.querySelector('[part~="card"]');
  }

  /** Open the card now, skipping `open-delay`. */
  show() {
    this.open = true;
    this.#sync();
  }

  /** Close the card now, skipping `close-delay`. */
  hide() {
    this.open = false;
    this.#sync();
  }

  /** Show or hide the card to match `open`, canceling pending delays. */
  #sync() {
    this.#intent.cancel();
    const card = /** @type {HTMLElement | null} */ (this.#card);

    if (!card || card.matches(':popover-open') === this.open) return;

    if (this.open) {
      card.showPopover();
      this.dispatchEvent(new Event('focsd-open', { bubbles: true }));
    } else {
      card.hidePopover();
      this.dispatchEvent(new Event('close'));
    }
  }

  /** @param {PointerEvent} event */
  #onEnter = (event) => {
    if (event.pointerType === 'touch') return;
    this.#intent.setHovered(true);
    this.#intent.cancelHide();

    if (!this.open) this.#intent.showAfter(this.openDelay);
  };

  /** @param {PointerEvent} event */
  #onLeave = (event) => {
    if (event.pointerType === 'touch') return;
    this.#intent.setHovered(false);
    // Close after the grace period unless the pointer or focus came back.
    this.#intent.hideAfter(this.closeDelay);
  };

  /** @param {FocusEvent} event */
  #onFocusIn = (event) => {
    this.#intent.setFocused(true);
    this.#intent.cancelHide();
    const trigger = this.trigger;

    if (trigger && composedContains(trigger, event.composedPath()[0])) this.show();
  };

  /** @param {FocusEvent} event */
  #onFocusOut = (event) => {
    const next = event.relatedTarget;

    if (next && composedContains(this, next)) return;
    this.#intent.setFocused(false);

    // Focus left both the trigger and the card: close now, there is no pointer grace for keyboards.
    if (!this.#intent.hovered) this.hide();
  };

  /** @param {KeyboardEvent} event */
  #onKeyDown = (event) => {
    if (event.key !== 'Escape' || !this.open) return;
    this.hide();
    // Only the card closes: not the dialog or sheet it sits in (WCAG 1.4.13, focus stays put).
    event.preventDefault();
    event.stopPropagation();
  };

  /** A press anywhere else closes the card: the only way out on touch, where there is no hover to leave. */
  /** @param {PointerEvent} event */
  #onDocumentPointerDown = (event) => {
    if (!composedContains(this, event.composedPath()[0])) {
      this.#suppressClick = false;

      if (this.open) this.hide();
    }
  };

  /** @param {PointerEvent} event */
  #onPointerDown = (event) => {
    // A long press that ended without a click (a context menu, a cancel) must not swallow this press.
    this.#suppressClick = false;

    if (event.pointerType !== 'touch' || !isFrom(event, this.trigger)) return;
    clearTimeout(this.#pressTimer);
    this.#pressTimer = setTimeout(() => {
      this.#suppressClick = true;
      this.show();
    }, LONG_PRESS);
  };

  #cancelPress = () => {
    clearTimeout(this.#pressTimer);
  };

  /** A long press opened the card: the click that follows must not also follow the link. */
  /** @param {MouseEvent} event */
  #onClick = (event) => {
    if (!this.#suppressClick) return;
    this.#suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
  };

  /**
   * The trigger is described by the card's content (light DOM next to it, so a real
   * aria-describedby works in every browser). It says whether the card is open only when the card
   * holds something to Tab to; a card of text adds nothing to expand into.
   */
  #describe = () => {
    const trigger = this.trigger;

    if (!trigger) return;
    const parts = [...this.children].filter((el) => el.getAttribute('slot') !== 'trigger' && el.textContent.trim());

    for (const el of parts) if (!el.id) el.id = uid('focsd-hover-card-text');
    const ids = parts.map((el) => el.id).join(' ');

    if ('description' in trigger) {
      // Focsd controls (focsd-button) forward a description to their inner element, as for tooltips.
      trigger.description = parts.map((el) => el.textContent.replaceAll(/\s+/g, ' ').trim()).join(' ');
    } else if (ids) trigger.setAttribute('aria-describedby', ids);
    else trigger.removeAttribute('aria-describedby');

    const slot = /** @type {HTMLSlotElement | null} */ (this.renderRoot.querySelector('[part~="card"] > slot'));
    const expanded = slot && firstFocusable(slot) ? this.open : undefined;

    if ('expanded' in trigger) trigger.expanded = expanded;
    else if (expanded === undefined) trigger.removeAttribute('aria-expanded');
    else trigger.setAttribute('aria-expanded', String(expanded));
  };

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    if (changed.has('open')) this.#sync();
    this.#describe();
  }

  /** @override */
  render() {
    return html`<slot name="trigger" @slotchange=${this.#describe}></slot
      ><div part="card" popover="manual"><slot @slotchange=${this.#describe}></slot></div>`;
  }
}
