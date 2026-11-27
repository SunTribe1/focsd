import { css } from 'lit';
import { FocsdTimeFieldBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { fieldStyles } from '@focsd-dev/primitives/styles/field.js';
import { fieldLayoutStyles } from '@focsd-dev/primitives/styles/field-layout.js';
import { segmentStyles } from '@focsd-dev/primitives/styles/segments.js';

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
