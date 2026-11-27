import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';

/**
 * Timeline: an ordered list of events.
 *
 * @slot - Default content.
 * @csspart list - The list element.
 */
export class FocsdTimelineBase extends FocsdElement {
  /** @override */
  updated() {
    this.setAttribute('role', 'list');
  }

  /** @override */
  render() {
    return html`<div part="list"><slot></slot></div>`;
  }
}
