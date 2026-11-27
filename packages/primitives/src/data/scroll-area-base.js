import { html, nothing } from 'lit';
import { cssomStyle } from '../internal/style.js';
import { FocsdElement } from '../internal/focsd-element.js';

/**
 * A labeled, keyboard-scrollable region.
 *
 * @slot - Default content.
 * @csspart viewport - The viewport element.
 */
export class FocsdScrollAreaBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { label: {}, maxBlockSize: { attribute: 'max-block-size' } };

  constructor() {
    super();
    /** The accessible name of the scrolling region, which is focusable so it scrolls by keyboard. */
    this.label = '';
    /** The tallest the area grows before it scrolls, as a CSS length. */
    this.maxBlockSize = '';
  }

  /** @override */
  render() {
    return html`<div part="viewport" role="region" aria-label=${this.label || nothing} tabindex="0" style=${cssomStyle({ 'max-block-size': this.maxBlockSize || undefined })}><slot></slot></div>`;
  }
}
