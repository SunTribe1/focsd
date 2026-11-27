import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';

/**
 * Breadcrumb: a labeled navigation landmark with an ordered list of items.
 *
 * @slot - Default content.
 * @csspart list - The list element.
 * @csspart nav - The nav element.
 */
export class FocsdBreadcrumbBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { label: {} };

  constructor() {
    super();
    /** The accessible name of the breadcrumb navigation. */
    this.label = '';
  }

  /** @override */
  render() {
    /* eslint-disable lit-a11y/list -- slotted items carry role=listitem */
    return html`<nav part="nav" aria-label=${this.label || this.localize.term('breadcrumb')}><ol part="list"><slot></slot></ol></nav>`;
  }
  /* eslint-enable lit-a11y/list */
}
