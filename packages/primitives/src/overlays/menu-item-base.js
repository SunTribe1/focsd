import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { uid } from '../internal/id.js';
import { iconSlotStyles, leadingIcon } from '../internal/icon-slot.js';
import { labelText } from '../internal/text.js';

/**
 * A menu item. Sets role=menuitem and tabindex=-1 on itself; the menu manages focus.
 *
 * @slot - Default content.
 * @slot icon - Any icon markup before the label (an SVG, an icon component, an icon-font element), instead of `icon`.
 * @csspart icon - The icon wrapper (decorative; the label names the element).
 */
export class FocsdMenuItemBase extends FocsdElement {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdElement.styles, iconSlotStyles];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    icon: {},
    iconLibrary: { attribute: 'icon-library' },
    value: {},
    disabled: { type: Boolean, reflect: true },
    variant: { reflect: true },
  };

  constructor() {
    super();
    /** An icon before the label: a name from the default icon library (or `icon-library`). For any other icon kit, put it in `slot="icon"`. */
    this.icon = '';
    /** The registered icon library `icon` comes from; empty for the default. */
    this.iconLibrary = '';
    /** The value sent in `focsd-select`. */
    this.value = '';
    /** Disables the item. */
    this.disabled = false;
    /** @type {'' | 'critical'} `critical` marks a destructive action. */
    this.variant = '';
  }

  /**
   * The item's text.
   * @returns {string}
   */
  get label() {
    return labelText(this);
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
    // Cast so TS does not treat the assignment as a new `id` field declaration.
    const host = /** @type {HTMLElement} */ (this);

    if (!host.id) host.id = uid('focsd-menu-item');
    this.setAttribute('role', 'menuitem');
    this.setAttribute('tabindex', '-1');
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    if (!changed.has('disabled')) return;

    if (this.disabled) this.setAttribute('aria-disabled', 'true');
    else this.removeAttribute('aria-disabled');
  }

  /** @override */
  render() {
    return html`${leadingIcon(this)}<slot></slot>`;
  }
}
