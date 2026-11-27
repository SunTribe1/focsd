import { FocsdPasswordFieldBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { fieldStyles } from '@focsd/primitives/styles/field.js';
import { fieldLayoutStyles } from '@focsd/primitives/styles/field-layout.js';
import { adornedStyles } from '@focsd/primitives/styles/adorned.js';

export class FocsdPasswordField extends FocsdPasswordFieldBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdPasswordFieldBase.styles, hostStyles, fieldStyles, fieldLayoutStyles, adornedStyles];
}

defineElement('focsd-password-field', FocsdPasswordField);
