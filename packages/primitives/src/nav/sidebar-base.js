import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { iconSvg } from '../internal/icons.js';
import { uid } from '../internal/id.js';
import { FocsdSidebarItemBase } from './sidebar-item-base.js';

/**
 * Sidebar: a labeled navigation landmark with a collapse toggle.
 *
 * @slot - Default content.
 * @csspart list - The list element.
 * @csspart nav - The nav element.
 * @csspart toggle - The toggle element.
 */
export class FocsdSidebarBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { label: {}, collapsed: { type: Boolean, reflect: true } };

  #listId = uid('focsd-sidebar-list');

  constructor() {
    super();
    /** The accessible name of the navigation. */
    this.label = '';
    /** Shows only the icons, to save room; the toggle button switches it. */
    this.collapsed = false;
  }

  #sync = () => {
    for (const item of this.children) if (item instanceof FocsdSidebarItemBase) item.collapsed = this.collapsed;
  };

  /** @override */
  updated() {
    this.#sync();
  }

  /** @override */
  render() {
    return html`<nav part="nav" aria-label=${this.label || nothing}>
      <button part="toggle" type="button" aria-label=${this.localize.term('collapseSidebar')} aria-expanded=${String(!this.collapsed)} aria-controls=${this.#listId} @click=${() => {
        this.collapsed = !this.collapsed;
      }}>${iconSvg(this.collapsed ? 'chevron-right' : 'chevron-left')}</button>
      <div part="list" id=${this.#listId}><slot @slotchange=${this.#sync}></slot></div>
    </nav>`;
  }
}
