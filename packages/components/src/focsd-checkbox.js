import { css } from 'lit';
import { FocsdCheckboxBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { fieldLayoutStyles } from '@focsd/primitives/styles/field-layout.js';
import { choiceStyles } from '@focsd/primitives/styles/choice.js';

export class FocsdCheckbox extends FocsdCheckboxBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdCheckboxBase.styles,
    hostStyles,
    choiceStyles,
    fieldLayoutStyles,
    css`
      [part~='control'] {
        inline-size: var(--focsd-control-indicator, 1rem);
        block-size: var(--focsd-control-indicator, 1rem);
        margin: 0;
        accent-color: var(--focsd-field-border-color, var(--focsd-action));
        flex: none;
        cursor: inherit;
      }
      ::slotted(a) {
        color: var(--focsd-route);
      }
    `,
  ];
}

defineElement('focsd-checkbox', FocsdCheckbox);
