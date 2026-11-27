import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';

/**
 * Site footer: a contentinfo landmark with a brand area, link sections and a legal row.
 *
 * @slot brand - Logo, product name or a short description.
 * @slot - focsd-footer-section elements.
 * @slot legal - Copyright notice and policy links.
 * @csspart footer - The footer element.
 * @csspart brand - The brand container.
 * @csspart sections - The container of link sections.
 * @csspart legal - The legal row.
 */
export class FocsdFooterBase extends FocsdElement {
  /** @override */
  render() {
    return html`<footer part="footer" role="contentinfo">
      <div part="top">
        <div part="brand"><slot name="brand"></slot></div>
        <div part="sections"><slot></slot></div>
      </div>
      <div part="legal"><slot name="legal"></slot></div>
    </footer>`;
  }
}
