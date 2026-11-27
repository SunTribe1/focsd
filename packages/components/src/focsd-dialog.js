import { FocsdDialogBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { enterMotion } from '@focsd-dev/primitives/styles/motion.js';
import { dialogStyles } from '@focsd-dev/primitives/styles/dialog.js';

/**
 * @cssprop --focsd-dialog-padding - Padding inside the dialog (default `--focsd-space-6`).
 */
export class FocsdDialog extends FocsdDialogBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdDialogBase.styles,
    hostStyles,
    dialogStyles,
    enterMotion("[part~='dialog'][open]", { from: 'scale(0.98)', duration: 'slow' }),
    enterMotion("[part~='dialog'][open]::backdrop", { from: 'none', duration: 'slow' }),
  ];
}

defineElement('focsd-dialog', FocsdDialog);
