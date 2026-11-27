import { FocsdTextFieldBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { fieldStyles } from '@focsd-dev/primitives/styles/field.js';
import { fieldLayoutStyles } from '@focsd-dev/primitives/styles/field-layout.js';

export class FocsdTextField extends FocsdTextFieldBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdTextFieldBase.styles, hostStyles, fieldStyles, fieldLayoutStyles];
}

defineElement('focsd-text-field', FocsdTextField);
