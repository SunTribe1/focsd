import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { routeLinks } from '../internal/links.js';
import { uid } from '../internal/id.js';

/**
 * A group of footer links: a navigation landmark labeled by its heading.
 *
 * @slot - Links (`<a href>`).
 * @csspart nav - The navigation element.
 * @csspart heading - The heading.
 * @csspart links - The links container.
 */
export class FocsdFooterSectionBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { heading: {}, level: { type: Number } };

  #headingId = uid('focsd-footer-heading');

  constructor() {
    super();
    // Plain same-origin link clicks go to the app's link handler (setLinkHandler), if any.
    routeLinks(this);
    /** The section's heading. */
    this.heading = '';
    /** The heading level (1 to 6). */
    this.level = 2;
  }

  /** @override */
  render() {
    return html`<nav part="nav" aria-labelledby=${this.#headingId}>
      <div part="heading" id=${this.#headingId} role="heading" aria-level=${this.level}>${this.heading}</div>
      <div part="links"><slot></slot></div>
    </nav>`;
  }
}
