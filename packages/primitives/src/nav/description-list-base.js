import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';

/**
 * Layout container for description items.
 *
 * @slot - Default content.
 * @csspart list - The list element.
 */
export class FocsdDescriptionListBase extends FocsdElement {
  /** @override */
  render() {
    return html`<div part="list"><slot></slot></div>`;
  }
}
