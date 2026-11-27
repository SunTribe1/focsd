import { FocsdNumberFieldBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { fieldStyles } from '@focsd/primitives/styles/field.js';
import { fieldLayoutStyles } from '@focsd/primitives/styles/field-layout.js';
import { adornedStyles } from '@focsd/primitives/styles/adorned.js';

export class FocsdNumberField extends FocsdNumberFieldBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdNumberFieldBase.styles, hostStyles, fieldStyles, fieldLayoutStyles, adornedStyles];
}

defineElement('focsd-number-field', FocsdNumberField);
