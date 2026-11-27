import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { routeLinks } from '../internal/links.js';
import { iconSlotStyles, leadingIcon } from '../internal/icon-slot.js';

/**
 * Sidebar link with an icon; when collapsed the label is visually hidden but still names the link.
 *
 * @slot - Default content.
 * @csspart hidden - Added to the label while the sidebar is collapsed (the label is then visually hidden).
 * @slot icon - Any icon markup (an SVG, an icon component, an icon-font element), instead of `icon`.
 * @csspart icon - The icon element.
 * @csspart label - The label element.
 * @csspart link - The link element.
 */
export class FocsdSidebarItemBase extends FocsdElement {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdElement.styles, iconSlotStyles];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    href: {},
    icon: {},
    iconLibrary: { attribute: 'icon-library' },
    current: { type: Boolean, reflect: true },
    collapsed: { type: Boolean, reflect: true },
  };

  constructor() {
    super();
    // Plain same-origin link clicks go to the app's link handler (setLinkHandler), if any.
    routeLinks(this);
    /** The link's URL. */
    this.href = '';
    /** The name of an icon from the default icon library (or `icon-library`). */
    this.icon = '';
    /** The registered icon library `icon` comes from; empty for the default. For any other icon kit, use `slot="icon"`. */
    this.iconLibrary = '';
    /** Marks the link as the current page (aria-current="page"). */
    this.current = false;
    /** Set by the sidebar: shows only the icon. */
    this.collapsed = false;
  }

  /** @override */
  render() {
    return html`<a part="link" href=${this.href || nothing} aria-current=${this.current ? 'page' : nothing}>
      ${leadingIcon(this)}<span part="label ${this.collapsed ? 'hidden' : ''}" class=${this.collapsed ? 'focsd-visually-hidden' : ''}><slot></slot></span>
    </a>`;
  }
}
