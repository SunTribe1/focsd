import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';

/**
 * A named group of buttons, joined visually.
 *
 * @slot - Default content.
 * @csspart group - The group element.
 */
export class FocsdButtonGroupBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { label: {} };

  constructor() {
    super();
    /** The accessible name of the group. */
    this.label = '';
  }

  /** @override */
  updated() {
    this.setAttribute('role', 'group');

    if (this.label) this.setAttribute('aria-label', this.label);
    else this.removeAttribute('aria-label');
  }

  /** @override */
  render() {
    return html`<div part="group"><slot></slot></div>`;
  }
}
