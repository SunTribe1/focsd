import { css } from 'lit';
import { FocsdOptionGroupBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { groupLabel, groupRule } from '@focsd-dev/primitives/styles/listbox.js';
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
