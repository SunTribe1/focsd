import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { routeLinks } from '../internal/links.js';
import { onFocusLeave } from '../internal/popup.js';
import { iconSvg } from '../internal/icons.js';
import { uid } from '../internal/id.js';
import { iconSlotStyles, leadingIcon } from '../internal/icon-slot.js';

/**
 * Navigation item: a link (`href`), or a disclosure group (`label` + slotted links). A group fires
 * `toggle` whenever it opens or closes, however (click, Escape, focus leaving, setting `open`).
 *
 * @fires toggle - Fired when the element opens or closes. Like `<details>`, it does not bubble.
 * @slot - Default content.
 * @csspart chevron - A group's open/close chevron.
 * @csspart link - The link element.
 * @csspart panel - The panel element.
 * @csspart trigger - The trigger element.
 * @slot icon - Any icon markup before the label (an SVG, an icon component, an icon-font element), instead of `icon`.
 * @csspart icon - The icon wrapper (decorative).
 */
export class FocsdNavItemBase extends FocsdElement {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdElement.styles, iconSlotStyles];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    icon: {},
    iconLibrary: { attribute: 'icon-library' },
    href: {},
    label: {},
    current: { type: Boolean, reflect: true },
    open: { type: Boolean, reflect: true },
  };

  #panelId = uid('focsd-nav-panel');

  constructor() {
    super();
    /** An icon before the label: a name from the default icon library (or `icon-library`). For any other icon kit, put it in `slot="icon"`. */
    this.icon = '';
    /** The registered icon library `icon` comes from; empty for the default. */
    this.iconLibrary = '';
    // Plain same-origin link clicks go to the app's link handler (setLinkHandler), if any.
    routeLinks(this);
    /** The link's URL. Without it, an item with a `label` is a group of the items inside. */
    this.href = '';
    /** The text of a group's button. */
    this.label = '';
    /** Marks the link as the current page (aria-current="page"). */
    this.current = false;
    /** Whether a group is open. */
    this.open = false;
    this.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.open && !event.defaultPrevented) {
        // Consumed here, so a sheet or dialog around the menu stays open until the next Escape.
        event.preventDefault();
        this.open = false;
        /** @type {HTMLElement} */ (this.renderRoot.querySelector('[part~="trigger"]'))?.focus();
      }
    });
    onFocusLeave(this, () => {
      if (this.open) this.open = false;
    });
  }

  /** Whether the item is a group of links (a label and no `href`). */
  get isGroup() {
    return !this.href && Boolean(this.label);
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    this.setAttribute('role', 'listitem');

    if (changed.has('open') && changed.get('open') !== undefined) this.dispatchEvent(new Event('toggle'));
  }

  #toggle = () => {
    this.open = !this.open;
  };

  /** @override */
  render() {
    if (!this.isGroup) {
      return html`<a part="link" href=${this.href || nothing} aria-current=${this.current ? 'page' : nothing}>${leadingIcon(this)}<slot></slot></a>`;
    }

    return html`<button part="trigger" type="button" aria-expanded=${String(this.open)} aria-controls=${this.#panelId} @click=${this.#toggle}>${leadingIcon(this)}${this.label}<span part="chevron" aria-hidden="true">${iconSvg('chevron-down')}</span></button>
      <div part="panel" id=${this.#panelId} ?hidden=${!this.open}><slot></slot></div>`;
  }
}
