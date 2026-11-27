import { css } from 'lit';
import { FocsdFooterSectionBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';

export class FocsdFooterSection extends FocsdFooterSectionBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdFooterSectionBase.styles,
    hostStyles,
    css`
      :host {
        display: block;
      }
      [part~='heading'] {
        margin-block-end: var(--focsd-space-2);
        font-size: var(--focsd-text-small-size);
        font-weight: var(--focsd-text-label-weight);
      }
      [part~='links'] {
        display: grid;
        justify-items: start;
      }
      ::slotted(a) {
        display: inline-flex;
        align-items: center;
        min-block-size: var(--focsd-target-min);
        padding-block: var(--focsd-space-1);
        color: var(--focsd-route);
        text-decoration: underline;
        text-underline-offset: 0.2em;
      }
    `,
  ];
}

defineElement('focsd-footer-section', FocsdFooterSection);
