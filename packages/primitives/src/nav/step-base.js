import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';

/**
 * A step: list item with aria-current="step" when current and textual status.
 *
 * @slot - Default content.
 * @csspart label - The label element.
 * @csspart marker - The step marker (decorative; the status is also given as text).
 */
export class FocsdStepBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { status: { reflect: true } };

  constructor() {
    super();
    /** @type {'upcoming' | 'current' | 'complete'} The step's status, shown and also given as text. Set by the stepper. */
    this.status = 'upcoming';
  }

  /** @override */
  updated() {
    this.setAttribute('role', 'listitem');

    if (this.status === 'current') this.setAttribute('aria-current', 'step');
    else this.removeAttribute('aria-current');
  }

  /** @override */
  render() {
    /** @type {Record<string, string>} */
    const terms = { complete: 'stepComplete', current: 'stepCurrent', upcoming: 'stepUpcoming' };
    const text = this.localize.term(/** @type {string} */ (terms[this.status]));

    return html`<span part="marker" aria-hidden="true"></span><span part="label"><slot></slot></span><span class="focsd-visually-hidden">, ${text}</span>`;
  }
}
