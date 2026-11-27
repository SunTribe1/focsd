import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { iconSlotStyles, leadingIcon } from '../internal/icon-slot.js';

/**
 * Empty state with a heading of the given level, description and actions.
 *
 * @slot - Default content.
 * @slot actions - Buttons or links for the next step.
 * @csspart actions - The actions element.
 * @csspart body - The body element.
 * @csspart empty - The empty element.
 * @csspart headline - The headline element.
 * @slot icon - Any icon markup (an SVG, an icon component, an icon-font element), instead of `icon`.
 * @csspart icon - The icon element.
 */
export class FocsdEmptyStateBase extends FocsdElement {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdElement.styles, iconSlotStyles];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { headline: {}, level: { type: Number }, icon: {}, iconLibrary: { attribute: 'icon-library' } };

  constructor() {
    super();
    /** The heading. */
    this.headline = '';
    /** The heading level (1 to 6). */
    this.level = 2;
    /** The name of an icon from the default icon library (or `icon-library`), shown above the heading. */
    this.icon = '';
    /** The registered icon library `icon` comes from; empty for the default. For any other icon kit, use `slot="icon"`. */
    this.iconLibrary = '';
  }

  /** @override */
  render() {
    return html`<div part="empty">
      ${leadingIcon(this)}
      <div part="headline" role="heading" aria-level=${this.level}>${this.headline}</div>
      <div part="body"><slot></slot></div>
      <div part="actions"><slot name="actions"></slot></div>
    </div>`;
  }
}
