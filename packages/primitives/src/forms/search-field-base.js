import { html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { FocsdTextFieldBase } from '../text-field/text-field-base.js';
import { iconSvg } from '../internal/icons.js';

/**
 * Search field: native searchbox, a "Clear search" button when filled, Escape clears.
 *
 * @fires input - Fired on every user edit of the value.
 * @fires change - Fired when the user commits a change to the value or state.
 * @csspart clear - The clear button.
 * @csspart control - The control element.
 * @csspart icon - The icon element.
 * @csspart wrap - The box around the icon, the input and the clear button.
 */
export class FocsdSearchFieldBase extends FocsdTextFieldBase {
  constructor() {
    super();
    this.type = /** @type {const} */ ('search');
  }

  #clear() {
    this.value = '';
    /** @type {HTMLElement} */ (this.renderRoot.querySelector('[part~="control"]')).focus();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /** @override @param {import('../text-field/text-field-base.js').ControlContext} ctx */
  renderControl(ctx) {
    return html`<div part="wrap">
      <span part="icon" aria-hidden="true">${iconSvg('search')}</span>
      <input
        part="control"
        id=${ctx.id}
        type="search"
        .value=${live(this.value)}
        ?required=${this.required}
        ?disabled=${this.isDisabled}
        placeholder=${this.placeholder || nothing}
        autocomplete=${this.autocomplete || 'off'}
        aria-describedby=${ctx.describedBy || nothing}
        @input=${ctx.onInput}
        @change=${ctx.onChange}
        @keydown=${(/** @type {KeyboardEvent} */ event) => {
          if (event.key === 'Escape' && this.value) {
            event.preventDefault();
            this.#clear();

            return;
          }

          ctx.onKeyDown(event);
        }}
      />
      ${
        this.value && !this.isDisabled
          ? html`<button part="clear" type="button" aria-label=${this.localize.term('clearSearch')} @click=${() => this.#clear()}>${iconSvg('x')}</button>`
          : nothing
      }
    </div>`;
  }
}
