import { html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { FocsdTextFieldBase } from '../text-field/text-field-base.js';
import { iconSvg } from '../internal/icons.js';

/**
 * Password field with a "Show password" toggle (aria-pressed).
 *
 * @csspart control - The control element.
 * @csspart reveal - The show or hide password button.
 * @csspart wrap - The box around the input and the reveal button.
 */
export class FocsdPasswordFieldBase extends FocsdTextFieldBase {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { revealed: { type: Boolean, reflect: true } };

  constructor() {
    super();
    this.type = /** @type {const} */ ('password');
    this.autocomplete = /** @type {const} */ ('current-password');
    /** Shows the password as plain text. */
    this.revealed = false;
  }

  /** @override @param {import('../text-field/text-field-base.js').ControlContext} ctx */
  renderControl(ctx) {
    return html`<div part="wrap">
      <input
        part="control"
        id=${ctx.id}
        type=${this.revealed ? 'text' : 'password'}
        .value=${live(this.value)}
        ?required=${this.required}
        ?disabled=${this.isDisabled}
        autocomplete=${this.autocomplete || nothing}
        spellcheck="false"
        autocapitalize="off"
        aria-describedby=${ctx.describedBy || nothing}
        @input=${ctx.onInput}
        @change=${ctx.onChange}
        @keydown=${ctx.onKeyDown}
      />
      <button part="reveal" type="button" aria-label=${this.localize.term('showPassword')} aria-pressed=${String(this.revealed)} ?disabled=${this.isDisabled} @click=${() => {
        this.revealed = !this.revealed;
      }}>${iconSvg(this.revealed ? 'eye-off' : 'eye')}</button>
    </div>`;
  }
}
