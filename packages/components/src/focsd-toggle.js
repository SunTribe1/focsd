import { css } from 'lit';
import { FocsdToggleBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { buttonStyles } from '@focsd-dev/primitives/styles/button.js';

/**
 * @cssprop --focsd-button-background - Background (default the surface; `--focsd-action` for `variant="action"`).
 * @cssprop --focsd-button-background-hover - Background on hover (default the sunk surface; `--focsd-action-hover` for `variant="action"`).
 * @cssprop --focsd-button-color - Text color (default the ink; `--focsd-on-action` for `variant="action"`).
 * @cssprop --focsd-button-border-color - Border color (default `--focsd-edge`; `--focsd-action` for `variant="action"`).
 * @cssprop --focsd-button-radius - Corner radius (default `--focsd-radius-control`).
 */
export class FocsdToggle extends FocsdToggleBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdToggleBase.styles,
    hostStyles,
    buttonStyles,
    css`
      :host([pressed]) [part~='control'] {
        background: var(--focsd-surface-sunk);
        border-color: var(--focsd-ink);
        box-shadow: inset 0 calc(-1 * var(--focsd-selection-bar-width)) 0 var(--focsd-action);
      }
      :host([pressed]) [part~='control']:focus-visible {
        box-shadow: var(--focsd-focus-ring);
      }
      @media (forced-colors: active) {
        :host([pressed]) [part~='control'] {
          border: 3px solid Highlight;
        }
      }
    `,
  ];
}

defineElement('focsd-toggle', FocsdToggle);
