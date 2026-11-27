import { html, nothing } from 'lit';
import { FocsdMenuBase } from '../overlays/menu-base.js';

/**
 * A menubar item: renders its own role=menuitem trigger and a role=menu of slotted FocsdMenuItemBase.
 *
 * @slot - Default content.
 * @csspart menu - The menu element.
 * @csspart trigger - The trigger element.
 */
export class FocsdMenubarItemBase extends FocsdMenuBase {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { tabStop: { attribute: false } };

  constructor() {
    super();
    /** Set by the menubar: whether this item is the menubar's one tab stop. */
    this.tabStop = false;
  }

  /** @override @returns {HTMLElement | null} */
  get trigger() {
    return this.renderRoot?.querySelector('[part~="trigger"]') ?? null;
  }

  /** @override */
  render() {
    return html`<button part="trigger" type="button" role="menuitem" tabindex=${this.tabStop ? '0' : '-1'}>${this.label}</button>
      <div part="menu" role="menu" aria-label=${this.label || nothing} popover="auto" @beforetoggle=${this.onBeforeToggle} @toggle=${this.onToggle}>
        <slot></slot>
      </div>`;
  }
}
