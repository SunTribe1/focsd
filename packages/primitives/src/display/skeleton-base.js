import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';

/**
 * Placeholder while content loads. Hidden from assistive technology.
 *
 * @csspart skeleton - The skeleton element.
 */
export class FocsdSkeletonBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { shape: { reflect: true }, lines: { type: Number } };

  constructor() {
    super();
    /** @type {'text' | 'rect' | 'circle'} The placeholder's shape. */
    this.shape = 'text';
    /** With `shape="text"`, the number of lines. */
    this.lines = 1;
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('aria-hidden', 'true');
  }

  /** @override */
  render() {
    const count = this.shape === 'text' ? Math.max(1, this.lines) : 1;

    return html`${Array.from({ length: count }, () => html`<span part="skeleton"></span>`)}`;
  }
}
