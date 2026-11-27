import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { uid } from '../internal/id.js';

/**
 * A radio. Sets its own role, id and roving tabindex; the group manages checked state.
 *
 * @slot - Default content.
 * @csspart indicator - The radio circle.
 * @csspart label - The label element.
 */
export class FocsdRadioBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { value: {}, disabled: { type: Boolean, reflect: true } };

  constructor() {
    super();
    /** The value the group takes when this radio is chosen. */
    this.value = '';
    /** Disables the radio. */
    this.disabled = false;
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();

    if (!(/** @type {HTMLElement} */ (this).id)) this.id = uid('focsd-radio');
    this.setAttribute('role', 'radio');

    if (!this.hasAttribute('aria-checked')) this.setAttribute('aria-checked', 'false');

    if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '-1');
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    if (!changed.has('disabled')) return;

    if (this.disabled) this.setAttribute('aria-disabled', 'true');
    else this.removeAttribute('aria-disabled');

    // The group owns the tab stop: let it move off (or back to) this radio.
    if (changed.get('disabled') !== undefined) /** @type {import('lit').ReactiveElement | null} */ (this.parentElement)?.requestUpdate?.();
  }

  /** @override */
  render() {
    return html`<span part="indicator" aria-hidden="true"></span><span part="label"><slot></slot></span>`;
  }
}
