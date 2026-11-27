import { css } from 'lit';
import { FocsdDateTimePickerBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles, visuallyHidden } from '@focsd/primitives/styles/shared.js';
import { fieldStyles } from '@focsd/primitives/styles/field.js';
import { fieldLayoutStyles } from '@focsd/primitives/styles/field-layout.js';
import { dialogStyles } from '@focsd/primitives/styles/dialog.js';
import { pickerStyles } from '@focsd/primitives/styles/picker.js';
import './focsd-calendar.js';
import './focsd-time-field.js';

/**
 * Date and time picker: a typed date, a calendar dialog and a time field in one labeled group.
 * The value is a local `YYYY-MM-DDTHH:mm` timestamp with no time zone.
 *
 * @fires input - Fired on every user edit of the value.
 * @fires change - Fired when the user commits a change to the value or state.
 */
export class FocsdDateTimePicker extends FocsdDateTimePickerBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdDateTimePickerBase.styles,
    hostStyles,
    dialogStyles,
    fieldStyles,
    fieldLayoutStyles,
    pickerStyles,
    css`
      [part~='field'] { flex-wrap: wrap; }
      [part~='field'] [part~='time'] { margin-inline-start: var(--focsd-space-2); }
      [part~='time'][data-inline]::part(label) { ${visuallyHidden} }
      [part~='dialog'] [part~='time'] { display: block; }
      [part~='done'] { background: var(--focsd-action); border-color: var(--focsd-action); color: var(--focsd-on-action); }
      [part~='done']:hover { background: var(--focsd-action-hover); }
    `,
  ];
}

defineElement('focsd-date-time-picker', FocsdDateTimePicker);
