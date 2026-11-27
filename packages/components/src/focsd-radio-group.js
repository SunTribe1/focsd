import { css } from 'lit';
import { FocsdRadioGroupBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { fieldLayoutStyles } from '@focsd-dev/primitives/styles/field-layout.js';
import './focsd-radio.js';

export class FocsdRadioGroup extends FocsdRadioGroupBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdRadioGroupBase.styles,
    hostStyles,
    fieldLayoutStyles,
    css`
      :host {
        display: block;
      }
      [part~='label'] {
        font-size: var(--focsd-text-small-size);
        font-weight: var(--focsd-text-label-weight);
      }
      [part~='group'] {
        display: grid;
        gap: var(--focsd-space-1);
      }
    `,
  ];
}

defineElement('focsd-radio-group', FocsdRadioGroup);
