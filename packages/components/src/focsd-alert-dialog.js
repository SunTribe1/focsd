import { css } from 'lit';
import { FocsdAlertDialogBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { enterMotion } from '@focsd-dev/primitives/styles/motion.js';
import { dialogStyles } from '@focsd-dev/primitives/styles/dialog.js';

/**
 * @cssprop --focsd-dialog-padding - Padding inside the dialog (default `--focsd-space-6`).
 */
export class FocsdAlertDialog extends FocsdAlertDialogBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdAlertDialogBase.styles,
    hostStyles,
    dialogStyles,
    css`
      [part~='dialog'] {
        border-block-start: calc(var(--focsd-border-width) * 4) solid var(--focsd-critical);
      }
      [part~='body'] {
        color: var(--focsd-ink);
      }
    `,
    enterMotion("[part~='dialog'][open]", { from: 'scale(0.98)', duration: 'slow' }),
    enterMotion("[part~='dialog'][open]::backdrop", { from: 'none', duration: 'slow' }),
  ];
}

defineElement('focsd-alert-dialog', FocsdAlertDialog);
