import { FocsdDialogBase } from './dialog-base.js';

/** Alert dialog: role=alertdialog described by its body; focus goes to [data-autofocus] (least destructive action). */
export class FocsdAlertDialogBase extends FocsdDialogBase {
  /** @override */
  static dialogRole = 'alertdialog';

  /** @override */
  static describeBody = true;

  /** @override */
  static closeButton = false;
}
