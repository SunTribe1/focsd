import { html } from 'lit';
import { FocsdDisclosureBase } from './disclosure-base.js';

/**
 * Accordion item: heading (aria-level) wrapping the disclosure button; the panel is a labeled region.
 *
 * @csspart heading - The heading element.
 */
export class FocsdAccordionItemBase extends FocsdDisclosureBase {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { heading: {}, level: { type: Number } };

  constructor() {
    super();
    /** The heading text of the item's button. */
    this.heading = '';
    /** The heading level (1 to 6) of the item's heading. */
    this.level = 3;
  }

  /** @override */
  render() {
    return html`<div part="heading" role="heading" aria-level=${this.level}>${this.renderButton(this.heading)}</div>${this.renderPanel('region')}`;
  }
}
