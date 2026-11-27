import { css } from 'lit';
import { FocsdButtonGroupBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';

export class FocsdButtonGroup extends FocsdButtonGroupBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdButtonGroupBase.styles,
    hostStyles,
    css`
      :host {
        display: inline-block;
      }
      [part~='group'] {
        display: inline-flex;
      }
      ::slotted(*) {
        --focsd-button-radius: 0;
      }
      ::slotted(*:first-child) {
        --focsd-button-radius: var(--focsd-radius-control) 0 0 var(--focsd-radius-control);
      }
      ::slotted(*:last-child) {
        --focsd-button-radius: 0 var(--focsd-radius-control) var(--focsd-radius-control) 0;
      }
      ::slotted(*:not(:first-child)) {
        margin-inline-start: calc(var(--focsd-border-width) * -1);
      }
    `,
  ];
}

defineElement('focsd-button-group', FocsdButtonGroup);
