import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { iconSvg } from '../internal/icons.js';
import { TriggerToggle, focusWithin } from '../internal/popup.js';

/** @typedef {import('../internal/types.js').Placement} Placement */

/** How long the announced text stays in the status region, so browsing past it later does not read it twice. */
const CLEAR_AFTER = 3000;

/**
 * Toggletip: an info button that opens a small popover of extra information, announced politely.
 * Unlike a tooltip it opens on click, tap or Enter (so it works on touch) and its content may hold
 * links, which follow the button in Tab order. Escape or a press elsewhere closes it; focus stays
 * on the button. On open the content's text is copied into a polite status region.
 *
 * @fires {Event} focsd-open - Fired when the toggletip opens.
 * @fires {Event} close - Fired when the toggletip closes.
 * @slot - The information shown in the popover.
 * @csspart button - The info button.
 * @csspart panel - The popover holding the content.
 * @csspart status - The visually hidden status region that announces the content.
 */
export class FocsdToggletipBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { label: {}, placement: { reflect: true } };

  #open = false;

  #clearTimer = 0;

  #toggle = new TriggerToggle(() => this.#panel.matches(':popover-open'));

  constructor() {
    super();
    /** The button's accessible name; defaults to "More information". */
    this.label = '';
    /**
     * @type {Placement} Which side of the button the popover opens on. The
     * sides are physical, as in focsd-tour: `left` stays on the left in a right-to-left page.
     */
    this.placement = 'top';
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this.#clearTimer);
    // Removal hides the popover without toggle events; reset so a moved toggletip opens (and announces) again.
    this.#open = false;
    this.#status?.replaceChildren();
    this.requestUpdate();
  }

  get #panel() {
    return /** @type {HTMLElement} */ (this.renderRoot.querySelector('[part~="panel"]'));
  }

  get #button() {
    return /** @type {HTMLButtonElement} */ (this.renderRoot.querySelector('[part~="button"]'));
  }

  get #status() {
    return /** @type {HTMLElement} */ (this.renderRoot.querySelector('[part~="status"]'));
  }

  #onPointerDown = () => this.#toggle.press();

  #onClick = () => {
    // WebKit does not focus a clicked button; the button is where focus belongs while it is open.
    this.#button.focus();

    if (this.#toggle.release()) this.#panel.hidePopover();
    else this.#panel.showPopover();
  };

  /** @param {ToggleEvent} event */
  #onBeforeToggle = (event) => {
    // Closing with focus on a link inside: focus goes back to the button, not to the page.
    if (event.newState === 'closed' && focusWithin(this)) this.#button.focus();
  };

  /** @param {ToggleEvent} event */
  #onToggle = (event) => {
    const open = event.newState === 'open';

    if (open === this.#open) return;
    this.#open = open;
    this.requestUpdate();
    const status = this.#status;
    status.textContent = '';
    clearTimeout(this.#clearTimer);

    if (open) {
      const text = /** @type {HTMLSlotElement} */ (this.renderRoot.querySelector('slot'))
        .assignedNodes({ flatten: true })
        .map((node) => node.textContent)
        .join('')
        .replaceAll(/\s+/g, ' ')
        .trim();

      // Cleared first and written a frame later, so opening it again is heard again.
      requestAnimationFrame(() => {
        if (!this.#open) return;
        status.textContent = text;
        this.#clearTimer = setTimeout(() => (status.textContent = ''), CLEAR_AFTER);
      });
    }

    // `focsd-open` bubbles (docs/events.md); `close` does not, as on a native dialog.
    this.dispatchEvent(open ? new Event('focsd-open', { bubbles: true }) : new Event('close'));
  };

  /** @override */
  render() {
    return html`<button
        part="button"
        type="button"
        aria-label=${this.label || this.localize.term('moreInformation')}
        aria-expanded=${String(this.#open)}
        aria-controls="panel"
        @pointerdown=${this.#onPointerDown}
        @click=${this.#onClick}
      >
        ${iconSvg('info')}</button
      ><div part="panel" id="panel" popover="auto" @beforetoggle=${this.#onBeforeToggle} @toggle=${this.#onToggle}><slot></slot></div
      ><span part="status" role="status" class="focsd-visually-hidden"></span>`;
  }
}
