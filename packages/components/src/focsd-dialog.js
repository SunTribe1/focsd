import { FocsdDialogBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { enterMotion } from '@focsd/primitives/styles/motion.js';
import { dialogStyles } from '@focsd/primitives/styles/dialog.js';

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
