import { FocsdDateRangePickerBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { fieldStyles } from '@focsd/primitives/styles/field.js';
import { fieldLayoutStyles } from '@focsd/primitives/styles/field-layout.js';
import { dialogStyles } from '@focsd/primitives/styles/dialog.js';
import { pickerStyles } from '@focsd/primitives/styles/picker.js';
import './focsd-calendar.js';

export class FocsdDateRangePicker extends FocsdDateRangePickerBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdDateRangePickerBase.styles, hostStyles, dialogStyles, fieldStyles, fieldLayoutStyles, pickerStyles];
}

defineElement('focsd-date-range-picker', FocsdDateRangePicker);
