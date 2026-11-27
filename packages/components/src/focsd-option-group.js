import { css } from 'lit';
import { FocsdOptionGroupBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { groupLabel, groupRule } from '@focsd/primitives/styles/listbox.js';
import './focsd-option.js';

export class FocsdOptionGroup extends FocsdOptionGroupBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdOptionGroupBase.styles,
    hostStyles,
    css`
      :host {
        display: block;
      }
      :host(:not(:first-child)) {
        ${groupRule}
      }
      [part~='label'] {
        ${groupLabel}
      }
    `,
  ];
}

defineElement('focsd-option-group', FocsdOptionGroup);
