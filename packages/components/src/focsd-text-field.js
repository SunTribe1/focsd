import { FocsdTextFieldBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { fieldStyles } from '@focsd/primitives/styles/field.js';
import { fieldLayoutStyles } from '@focsd/primitives/styles/field-layout.js';

export class FocsdTextField extends FocsdTextFieldBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdTextFieldBase.styles, hostStyles, fieldStyles, fieldLayoutStyles];
}

defineElement('focsd-text-field', FocsdTextField);
