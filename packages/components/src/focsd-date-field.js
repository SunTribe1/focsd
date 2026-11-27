import { css } from 'lit';
import { FocsdDateFieldBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { fieldStyles } from '@focsd/primitives/styles/field.js';
import { fieldLayoutStyles } from '@focsd/primitives/styles/field-layout.js';
import { segmentStyles } from '@focsd/primitives/styles/segments.js';

/**
 * Date field: day, month and year segments in the locale's order, with a label, hint and messages.
 * Form value `YYYY-MM-DD`.
 */
export class FocsdDateField extends FocsdDateFieldBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdDateFieldBase.styles,
    hostStyles,
    fieldStyles,
    fieldLayoutStyles,
    segmentStyles,
    css`[part~='literal'] { color: var(--focsd-ink-muted); }`,
  ];
}

defineElement('focsd-date-field', FocsdDateField);
