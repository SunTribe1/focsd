import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';

/**
 * A plain container with optional header and footer slots. No landmark or article role.
 *
 * @slot - Default content.
 * @slot footer - Content at the bottom of the card, such as actions.
 * @slot header - Content at the top of the card, such as a heading.
 * @csspart body - The body element.
 * @csspart card - The card element.
 * @csspart footer - The footer element.
 * @csspart header - The header element.
 */
export class FocsdCardBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { variant: { reflect: true } };

  constructor() {
    super();
    /** @type {'outlined' | 'sunk'} The card's surface: an outlined card, or a sunk one with no border. */
    this.variant = 'outlined';
  }

  /** @param {Event} event */
  #toggleEmpty = (event) => {
    const slot = /** @type {HTMLSlotElement} */ (event.target);
    /** @type {HTMLElement} */ (slot.parentElement).hidden = slot.assignedNodes({ flatten: true }).length === 0;
  };

  /** @override */
  render() {
    return html`<div part="card">
      <div part="header" hidden><slot name="header" @slotchange=${this.#toggleEmpty}></slot></div>
      <div part="body"><slot></slot></div>
      <div part="footer" hidden><slot name="footer" @slotchange=${this.#toggleEmpty}></slot></div>
    </div>`;
  }
}
