import { FocsdComboboxBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { fieldStyles } from '@focsd-dev/primitives/styles/field.js';
import { fieldLayoutStyles } from '@focsd-dev/primitives/styles/field-layout.js';
import { comboStyles } from '@focsd-dev/primitives/styles/combo.js';
import { enterMotion, hoverMotion } from '@focsd-dev/primitives/styles/motion.js';
import './focsd-option.js';
import './focsd-option-group.js';

export class FocsdCombobox extends FocsdComboboxBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdComboboxBase.styles,
    hostStyles,
    fieldStyles,
    fieldLayoutStyles,
    comboStyles,
    enterMotion("[part~='popup']:popover-open"),
    hoverMotion("[part~='option'], [part~='clear']"),
  ];
}

defineElement('focsd-combobox', FocsdCombobox);
