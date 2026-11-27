import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { VisualViewportController } from '../internal/viewport.js';
import { iconSvg } from '../internal/icons.js';
import { TriggerToggle, firstFocusable, focusWithin, isFrom, setTriggerState } from '../internal/popup.js';

/** @typedef {import('../internal/types.js').BlockPlacement} BlockPlacement */

/**
 * Non-modal popover dialog opened by a slotted trigger. Light dismiss and Escape via popover="auto".
 *
 * @slot - Default content.
 * @slot trigger - The button that opens the popover.
 * @csspart close - The close (×) button, with `closable`; focus returns to the trigger.
 * @csspart panel - The panel element.
 */
export class FocsdPopoverBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { label: {}, open: { type: Boolean, reflect: true }, placement: { reflect: true }, closable: { type: Boolean } };

  #toggle = new TriggerToggle(() => this.#panel.matches(':popover-open'));

  constructor() {
    super();
    /** The accessible name of the panel. */
    this.label = '';
    /** Whether the popover is open. */
    this.open = false;
    /** @type {BlockPlacement} Reflected for styling. The built-in style places the panel below the trigger. */
    this.placement = 'bottom';
    /** Adds a close (×) button to the panel, for touch screens and panels with a form. Escape and a click outside close it either way. */
    this.closable = false;
    this.addEventListener('pointerdown', this.#onPointerDown, { capture: true });
    this.addEventListener('click', this.#onClick);
  }

  /**
   * The slotted trigger element.
   * @returns {HTMLElement | null}
   */
  get trigger() {
    return this.querySelector(':scope > [slot="trigger"]');
  }

  get #panel() {
    return /** @type {HTMLElement} */ (this.renderRoot.querySelector('[part~="panel"]'));
  }

  /** @param {PointerEvent} event */
  #onPointerDown = (event) => {
    if (isFrom(event, this.trigger)) this.#toggle.press();
  };

  /** @param {MouseEvent} event */
  #onClick = (event) => {
    if (!isFrom(event, this.trigger) || /** @type {{ isDisabled?: boolean }} */ (this.trigger).isDisabled) return;

    if (this.#toggle.release()) this.hide();
    else this.show();
  };

  /** Open the popover and move focus into it. */
  show() {
    const panel = this.#panel;

    if (!panel.matches(':popover-open')) /** @type {HTMLElement} */ (panel).showPopover();
    this.open = true;

    const target = /** @type {HTMLElement | null} */ (
      firstFocusable(/** @type {HTMLSlotElement} */ (this.renderRoot.querySelector('slot:not([name])')))
    );

    (target ?? panel).focus();
  }

  /** Close the popover. */
  hide() {
    const panel = this.#panel;

    if (panel.matches(':popover-open')) /** @type {HTMLElement} */ (panel).hidePopover();
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    setTriggerState(this.trigger, { expanded: this.open, haspopup: 'dialog' });

    if (changed.has('open') && changed.get('open') !== undefined) {
      const showing = this.#panel.matches(':popover-open');

      if (this.open && !showing) this.show();
      else if (!this.open && showing) this.hide();
    }
  }

  /** @param {ToggleEvent} event */
  #onBeforeToggle = (event) => {
    if (event.newState === 'closed' && focusWithin(this) && !(this.trigger && focusWithin(this.trigger)))
      /** @type {HTMLElement} */ (this.trigger)?.focus();
  };

  #viewport = new VisualViewportController(this);

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    // Removal hides the popover without toggle events; reset so a moved popover reads closed and opens again.
    this.open = false;
    this.#viewport.set(false);
  }

  /** @param {ToggleEvent} event */
  #onToggle = (event) => {
    this.open = event.newState === 'open';
    this.#viewport.set(this.open);
  };

  /** The close button: hide, then put focus back on the trigger, as Escape does. */
  #closeFromButton = () => {
    this.hide();
    /** @type {HTMLElement | null} */ (this.querySelector('[slot="trigger"]'))?.focus();
  };

  /** @override */
  render() {
    return html`<slot name="trigger" @slotchange=${() => this.requestUpdate()}></slot>
      <div part="panel" role="dialog" aria-label=${this.label} popover="auto" tabindex="-1" @beforetoggle=${this.#onBeforeToggle} @toggle=${this.#onToggle}>
        <slot></slot>
        ${
          this.closable
            ? html`<button part="close" type="button" aria-label=${this.localize.term('close')} @click=${this.#closeFromButton}>${iconSvg('x')}</button>`
            : nothing
        }
      </div>`;
  }
}
