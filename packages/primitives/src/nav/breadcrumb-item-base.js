import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { routeLinks } from '../internal/links.js';
import { iconSlotStyles, leadingIcon } from '../internal/icon-slot.js';

/**
 * Breadcrumb item: a link, or plain text marked aria-current="page" when `current`.
 *
 * @slot - Default content.
 * @csspart current - The current page (not a link).
 * @csspart link - The link element.
 * @csspart separator - The separator element.
 * @slot icon - Any icon markup before the label (an SVG, an icon component, an icon-font element), instead of `icon`.
 * @csspart icon - The icon wrapper (decorative).
 */
export class FocsdBreadcrumbItemBase extends FocsdElement {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdElement.styles, iconSlotStyles];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { icon: {}, iconLibrary: { attribute: 'icon-library' }, href: {}, current: { type: Boolean, reflect: true } };

  constructor() {
    super();
    /** An icon before the label: a name from the default icon library (or `icon-library`). For any other icon kit, put it in `slot="icon"`. */
    this.icon = '';
    /** The registered icon library `icon` comes from; empty for the default. */
    this.iconLibrary = '';
    // Plain same-origin link clicks go to the app's link handler (setLinkHandler), if any.
    routeLinks(this);
    /** The URL of the item's link. */
    this.href = '';
    /** Marks the item as the current page (aria-current="page"); it is not a link. */
    this.current = false;
  }

  /** @override */
  updated() {
    this.setAttribute('role', 'listitem');

    if (this.current) this.setAttribute('aria-current', 'page');
    else this.removeAttribute('aria-current');
  }

  /** @override */
  render() {
    return html`<span part="separator" aria-hidden="true">/</span>${
      this.current || !this.href
        ? html`<span part="current">${leadingIcon(this)}<slot></slot></span>`
        : html`<a part="link" href=${this.href}>${leadingIcon(this)}<slot></slot></a>`
    }`;
  }
}
