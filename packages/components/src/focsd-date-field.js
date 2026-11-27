import { css } from 'lit';
import { FocsdDateFieldBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { fieldStyles } from '@focsd-dev/primitives/styles/field.js';
import { fieldLayoutStyles } from '@focsd-dev/primitives/styles/field-layout.js';
import { segmentStyles } from '@focsd-dev/primitives/styles/segments.js';

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
