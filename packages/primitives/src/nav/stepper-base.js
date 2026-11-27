import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { FocsdStepBase } from './step-base.js';

/**
 * Stepper: labeled list of steps; `current` is the index of the current step.
 *
 * @slot - Default content.
 * @csspart steps - The steps element.
 */
export class FocsdStepperBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { label: {}, current: { type: Number } };

  constructor() {
    super();
    /** The accessible name of the list of steps. */
    this.label = '';
    /** The index of the current step, from 0; earlier steps are complete. */
    this.current = 0;
  }

  #sync = () => {
    [...(this.children ?? [])]
      .filter((c) => c instanceof FocsdStepBase)
      .forEach((step, i) => {
        step.status = i < this.current ? 'complete' : i === this.current ? 'current' : 'upcoming';
      });
  };

  /** @override */
  updated() {
    this.setAttribute('role', 'list');

    if (this.label) this.setAttribute('aria-label', this.label);
    this.#sync();
  }

  /** @override */
  render() {
    return html`<div part="steps"><slot @slotchange=${this.#sync}></slot></div>`;
  }
}
