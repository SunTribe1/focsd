import { leadingIcon } from '../internal/icon-slot.js';
import { html } from 'lit';
import { FocsdButtonBase } from '../button/button-base.js';

/**
 * Toggle button (aria-pressed). Inside a toggle group the group owns the pressed state.
 *
 * @fires change - Fired when the user commits a change to the value or state.
 * @slot - Default content.
 */
export class FocsdToggleBase extends FocsdButtonBase {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { pressed: { type: Boolean, reflect: true }, groupDisabled: { attribute: false } };

  constructor() {
    super();
    /** Whether the toggle is pressed. */
    this.pressed = false;
    /** Set by a toggle group: disables the toggle with its group. */
    this.groupDisabled = false;
    this.addEventListener('click', () => {
      if (this.isDisabled || /** @type {{ isToggleGroup?: boolean } | undefined} */ (this.parentElement?.constructor)?.isToggleGroup)
        return;
      this.pressed = !this.pressed;
      this.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  /**
   * Disabled directly, by a disabled fieldset, or by a disabled toggle group.
   * @override
   */
  get isDisabled() {
    return super.isDisabled || this.groupDisabled;
  }

  /** @override */
  render() {
    return this.renderButton(html`${leadingIcon(this)}<slot></slot>`, { pressed: this.pressed });
  }
}
