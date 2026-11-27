import { html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { FocsdElement } from '../internal/focsd-element.js';
import { FormControlMixin } from '../internal/form-control.js';
import { renderFieldLayout } from '../internal/field-messages.js';

/** @typedef {string} FormValue Any text, submitted as the control's form value. */

/**
 * Checkbox: native input inside a <label> wrapping the slotted label content.
 *
 * @fires change - Fired when the user commits a change to the value or state.
 * @slot - Default content.
 * @csspart control - The control element.
 * @csspart label - The label element.
 * @csspart text - The text element.
 * @csspart layout - The wrapper around the label and the body.
 * @csspart body - The label wrapper and the messages.
 * @csspart hint - The hint text.
 * @csspart message - The shown message (also error, warning or success).
 * @csspart message-icon - The icon in the message.
 * @csspart announcer - The hidden region that announces message changes.
 */
export class FocsdCheckboxBase extends FormControlMixin(FocsdElement) {
  /** The label sits after the box. */
  static defaultLabelPosition = 'end';

  /** @override */
  static shadowRootOptions = { ...FocsdElement.shadowRootOptions, delegatesFocus: true };

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    checked: { type: Boolean, reflect: true },
    indeterminate: { type: Boolean, reflect: true },
    value: {},
  };

  #defaultChecked = false;

  /** The initial checked state (the `checked` attribute at first connection), used by form reset. */
  get defaultChecked() {
    return this.#defaultChecked;
  }
  set defaultChecked(value) {
    this.#defaultChecked = Boolean(value);
  }

  constructor() {
    super();
    /** Whether the checkbox is checked. */
    this.checked = false;
    /** Shows the mixed state; cleared when the user changes the checkbox. */
    this.indeterminate = false;
    /** @type {FormValue} The value submitted when the checkbox is checked. */
    this.value = 'on';
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();

    if (!this.hasUpdated) this.#defaultChecked = this.hasAttribute('checked');
  }

  get #input() {
    return this.renderRoot.querySelector('input');
  }

  /** @override */
  updated() {
    this.internals.setFormValue(this.checked ? this.value : null);

    if (this.required && !this.checked) this.setValidityState({ valueMissing: true }, this.localize.term('checkToContinue'), this.#input);
    else this.setValidityState({});
  }

  formResetCallback() {
    this.checked = this.#defaultChecked;
  }

  /** @param {string | File | FormData | null} state */
  formStateRestoreCallback(state) {
    this.checked = state != null;
  }

  /** @param {Event} event */
  #onChange = (event) => {
    this.checked = /** @type {HTMLInputElement} */ (event.target).checked;
    this.indeterminate = false;
    this.dispatchEvent(new Event('change', { bubbles: true }));
  };

  /** @override */
  render() {
    const describedBy = this.describedByIds().join(' ');

    // The <label> wraps the input and the text (it gives the name); the position is a flex-direction swap inside it.
    const body = html`<label part="label" data-position=${this.effectiveLabelPosition}><input
        part="control"
        type="checkbox"
        .checked=${live(this.checked)}
        .indeterminate=${this.indeterminate}
        ?disabled=${this.isDisabled}
        ?required=${this.required}
        aria-describedby=${describedBy || nothing}
        @change=${this.#onChange}
      /><span part="text"><slot></slot></span></label>`;

    return renderFieldLayout(this, nothing, body);
  }
}
