import { FocsdDateRangePickerBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { fieldStyles } from '@focsd-dev/primitives/styles/field.js';
import { fieldLayoutStyles } from '@focsd-dev/primitives/styles/field-layout.js';
import { dialogStyles } from '@focsd-dev/primitives/styles/dialog.js';
import { pickerStyles } from '@focsd-dev/primitives/styles/picker.js';
import './focsd-calendar.js';

export class FocsdDateRangePicker extends FocsdDateRangePickerBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdDateRangePickerBase.styles, hostStyles, dialogStyles, fieldStyles, fieldLayoutStyles, pickerStyles];
}

defineElement('focsd-date-range-picker', FocsdDateRangePicker);
