import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { FormControlMixin } from '../internal/form-control.js';
import { uid } from '../internal/id.js';
import { renderFieldLayout } from '../internal/field-messages.js';

/** @typedef {string} FormValue Any text, submitted as the control's form value. */

/**
 * Switch: <button role=switch aria-checked> labeled by the slotted text; visible On/Off text.
 *
 * @fires input - Fired on every user edit of the value.
 * @fires change - Fired when the user commits a change to the value or state.
 * @slot - Default content.
 * @csspart control - The control element.
 * @csspart label - The label element.
 * @csspart state - The visible "On" or "Off" text (hidden from screen readers).
 * @csspart thumb - The thumb element.
 * @csspart layout - The wrapper around the label and the body.
 * @csspart body - The switch row and the messages.
 * @csspart hint - The hint text.
 * @csspart message - The shown message (also error, warning or success).
 * @csspart message-icon - The icon in the message.
 * @csspart announcer - The hidden region that announces message changes.
 */
export class FocsdSwitchBase extends FormControlMixin(FocsdElement) {
  /** The label sits after the switch. */
  static defaultLabelPosition = 'end';

  /** @override */
  static shadowRootOptions = { ...FocsdElement.shadowRootOptions, delegatesFocus: true };

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { checked: { type: Boolean, reflect: true }, value: {} };

  #labelId = uid('focsd-switch-label');

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
    /** Whether the switch is on. */
    this.checked = false;
    /** @type {FormValue} The value submitted when the switch is on. */
    this.value = 'on';
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();

    if (!this.hasUpdated) this.#defaultChecked = this.hasAttribute('checked');
  }

  /** @override */
  updated() {
    this.internals.setFormValue(this.checked ? this.value : null);
  }

  formResetCallback() {
    this.checked = this.#defaultChecked;
  }

  /** @param {string | File | FormData | null} state */
  formStateRestoreCallback(state) {
    this.checked = state != null;
  }

  #toggle = () => {
    if (this.isDisabled) return;
    this.checked = !this.checked;
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true }));
  };

  /** @override */
  render() {
    const describedBy = this.describedByIds().join(' ');

    /* eslint-disable lit-a11y/click-events-have-key-events -- the label is a pointer convenience; the switch button itself is keyboard-operable */
    const body = html`<div class="row" data-position=${this.effectiveLabelPosition}><button
        part="control"
        type="button"
        role="switch"
        aria-checked=${String(this.checked)}
        aria-labelledby=${this.#labelId}
        aria-describedby=${describedBy || nothing}
        aria-disabled=${this.isDisabled ? 'true' : nothing}
        @click=${this.#toggle}
      ><span part="thumb" aria-hidden="true"></span></button>
      <span part="label" id=${this.#labelId} @click=${this.#toggle}><slot></slot></span>
      <span part="state" aria-hidden="true">${this.localize.term(this.checked ? 'on' : 'off')}</span></div>`;

    return renderFieldLayout(this, nothing, body);
  }
  /* eslint-enable lit-a11y/click-events-have-key-events */
}
