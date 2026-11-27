import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';

/**
 * Text that is read by assistive technology but not shown.
 *
 * @slot - Default content.
 */
export class FocsdVisuallyHiddenBase extends FocsdElement {
  /** @override */
  render() {
    return html`<slot></slot>`;
  }
}
