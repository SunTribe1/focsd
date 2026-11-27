import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';

/**
 * A carousel slide: group named "n of N"; non-current slides are hidden and inert.
 *
 * @slot - Default content.
 */
export class FocsdCarouselSlideBase extends FocsdElement {
  /** @override */
  render() {
    return html`<slot></slot>`;
  }
}
