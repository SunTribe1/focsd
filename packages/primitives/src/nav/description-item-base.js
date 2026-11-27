import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';

/**
 * A term and its description, as its own <dl>.
 *
 * @slot - Default content.
 * @csspart description - The description element.
 * @csspart dl - The dl element.
 * @csspart term - The term element.
 */
export class FocsdDescriptionItemBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { term: {} };

  constructor() {
    super();
    /** The term the item describes. */
    this.term = '';
  }

  /** @override */
  render() {
    return html`<dl part="dl"><dt part="term">${this.term}</dt><dd part="description"><slot></slot></dd></dl>`;
  }
}
