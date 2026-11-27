import { FocsdMultiSelectBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { fieldStyles } from '@focsd-dev/primitives/styles/field.js';
import { fieldLayoutStyles } from '@focsd-dev/primitives/styles/field-layout.js';
import { comboStyles, taggedFieldStyles } from '@focsd-dev/primitives/styles/combo.js';
import { enterMotion, hoverMotion } from '@focsd-dev/primitives/styles/motion.js';
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
