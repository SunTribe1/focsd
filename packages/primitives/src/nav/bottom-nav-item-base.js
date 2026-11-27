import { html, isServer, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { routeLinks } from '../internal/links.js';
import { icon, slottedIconStyles } from '../internal/icons.js';

/**
 * Bottom navigation item: a real link with an icon and a visible label (never icon-only). The
 * current item is `aria-current="page"`; a badge adds to the link's name ("Inbox, 3 new").
 *
 * @slot - The label, when `label` is not set.
 * @slot icon - A custom icon (SVG) instead of the named one.
 * @csspart item - The wrapper inside the list item.
 * @csspart link - The link element.
 * @csspart icon - The icon (decorative).
 * @csspart label - The visible label.
 * @csspart badge - The badge (hidden from screen readers; its text is in the link's name).
 */
export class FocsdBottomNavItemBase extends FocsdElement {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdElement.styles, slottedIconStyles];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    href: {},
    icon: {},
    iconLibrary: { attribute: 'icon-library' },
    label: {},
    current: { type: Boolean, reflect: true },
    badge: {},
  };

  constructor() {
    super();
    // Plain same-origin link clicks go to the app's link handler (setLinkHandler), if any.
    routeLinks(this);
    /** The link's URL. */
    this.href = '';
    /** The name of an icon from the default icon library (or use the `icon` slot). */
    this.icon = '';
    /** The registered icon library `icon` comes from; empty for the default. */
    this.iconLibrary = '';
    /** The visible label (else the slotted text). */
    this.label = '';
    /** Marks the link as the current page (aria-current="page"). */
    this.current = false;
    /** A count or short text shown on the icon, such as "3"; empty shows none. */
    this.badge = '';
    // The host is the bar's list item. On the server the attribute is written now, so the list's children are
    // items before any script runs; in the browser a constructor must not add attributes, so `updated()` does.

    if (isServer) this.setAttribute('role', 'listitem');
  }

  /** @override */
  updated() {
    this.setAttribute('role', 'listitem');
  }

  /** The link's name with the badge, or undefined when there is no badge (the content names it). */
  get #badgeName() {
    const badge = String(this.badge ?? '').trim();

    if (!badge) return undefined;
    const label = this.label || (this.textContent ?? '').trim();

    return this.localize.term('bottomNavBadge', label, badge);
  }

  /** @override */
  render() {
    const badge = String(this.badge ?? '').trim();

    return html`<div part="item">
      <a part="link" href=${this.href || nothing} aria-current=${this.current ? 'page' : nothing} aria-label=${this.#badgeName ?? nothing}
        ><span part="icon" aria-hidden="true"><slot name="icon">${this.icon ? icon({ name: this.icon, library: this.iconLibrary || undefined }, 'svg') : nothing}</slot></span
        ><span part="label">${this.label}<slot></slot></span
        >${badge ? html`<span part="badge" aria-hidden="true">${badge}</span>` : nothing}</a
      >
    </div>`;
  }
}
