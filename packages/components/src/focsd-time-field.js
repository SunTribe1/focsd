import { css } from 'lit';
import { FocsdTimeFieldBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { fieldStyles } from '@focsd/primitives/styles/field.js';
import { fieldLayoutStyles } from '@focsd/primitives/styles/field-layout.js';
import { segmentStyles } from '@focsd/primitives/styles/segments.js';

export class FocsdTimeField extends FocsdTimeFieldBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdTimeFieldBase.styles,
    hostStyles,
    fieldStyles,
    fieldLayoutStyles,
    segmentStyles,
    css`[part~='period'] { margin-inline-start: var(--focsd-space-1); }`,
  ];
}

defineElement('focsd-time-field', FocsdTimeField);
