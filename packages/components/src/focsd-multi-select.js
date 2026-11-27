import { FocsdMultiSelectBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { fieldStyles } from '@focsd/primitives/styles/field.js';
import { fieldLayoutStyles } from '@focsd/primitives/styles/field-layout.js';
import { comboStyles, taggedFieldStyles } from '@focsd/primitives/styles/combo.js';
import { enterMotion, hoverMotion } from '@focsd/primitives/styles/motion.js';
import './focsd-option.js';
import './focsd-option-group.js';

export class FocsdMultiSelect extends FocsdMultiSelectBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdMultiSelectBase.styles,
    hostStyles,
    fieldStyles,
    fieldLayoutStyles,
    comboStyles,
    taggedFieldStyles,
    enterMotion("[part~='popup']:popover-open"),
    hoverMotion("[part~='option'], [part~='clear']"),
  ];
}

defineElement('focsd-multi-select', FocsdMultiSelect);
