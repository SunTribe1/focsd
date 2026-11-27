import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';

/**
 * Separator. `decorative` removes it from the accessibility tree.
 *
 * @csspart line - The line element.
 */
export class FocsdSeparatorBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    orientation: { reflect: true },
    decorative: { type: Boolean, reflect: true },
  };

  constructor() {
    super();
    /** @type {'horizontal' | 'vertical'} The direction of the line. */
    this.orientation = 'horizontal';
    /** Removes the separator from the accessibility tree. */
    this.decorative = false;
  }

  /** @override */
  updated() {
    if (this.decorative) {
      this.setAttribute('role', 'none');
      this.removeAttribute('aria-orientation');
    } else {
      this.setAttribute('role', 'separator');
      this.setAttribute('aria-orientation', this.orientation === 'vertical' ? 'vertical' : 'horizontal');
    }
  }

  /** @override */
  render() {
    return html`<div part="line"></div>`;
  }
}
