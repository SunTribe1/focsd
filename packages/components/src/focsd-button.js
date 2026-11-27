import { FocsdButtonBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { buttonStyles } from '@focsd/primitives/styles/button.js';

/**
 * @cssprop --focsd-button-background - Background (default the surface; `--focsd-action` for `variant="action"`).
 * @cssprop --focsd-button-background-hover - Background on hover (default the sunk surface; `--focsd-action-hover` for `variant="action"`).
 * @cssprop --focsd-button-color - Text color (default the ink; `--focsd-on-action` for `variant="action"`).
 * @cssprop --focsd-button-border-color - Border color (default `--focsd-edge`; `--focsd-action` for `variant="action"`).
 * @cssprop --focsd-button-radius - Corner radius (default `--focsd-radius-control`).
 */
export class FocsdButton extends FocsdButtonBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdButtonBase.styles, hostStyles, buttonStyles];
}

defineElement('focsd-button', FocsdButton);
