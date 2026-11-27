import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';

/**
 * Keyboard key.
 *
 * @slot - Default content.
 * @csspart kbd - The kbd element.
 */
export class FocsdKbdBase extends FocsdElement {
  /** @override */
  render() {
    return html`<kbd part="kbd"><slot></slot></kbd>`;
  }
}
