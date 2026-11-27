import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { uid } from '../internal/id.js';

/**
 * A tab panel. Focusable (tabindex 0) per the APG tabs pattern.
 *
 * @slot - Default content.
 */
export class FocsdTabPanelBase extends FocsdElement {
  /** @override */
  connectedCallback() {
    super.connectedCallback();
    const host = /** @type {HTMLElement} */ (this);

    if (!host.id) host.id = uid('focsd-tab-panel');
    this.setAttribute('role', 'tabpanel');
    this.setAttribute('tabindex', '0');
  }

  /** @override */
  render() {
    return html`<slot></slot>`;
  }
}
