import { css } from 'lit';
import { FocsdOtpFieldBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { fieldLayoutStyles } from '@focsd/primitives/styles/field-layout.js';

export class FocsdOtpField extends FocsdOtpFieldBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdOtpFieldBase.styles,
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
        display: flex;
        gap: var(--focsd-space-2);
      }
      [part~='cell'] {
        box-sizing: border-box;
        inline-size: var(--focsd-control-height);
        min-block-size: var(--focsd-control-height);
        padding: 0;
        text-align: center;
        font: inherit;
        font-family: var(--focsd-font-mono);
        font-size: var(--focsd-text-subheading-size);
        color: var(--focsd-ink);
        background: var(--focsd-surface);
        border: var(--focsd-border-width) solid var(--focsd-field-border-color, var(--focsd-edge));
        border-radius: var(--focsd-radius-control);
      }
    `,
  ];
}

defineElement('focsd-otp-field', FocsdOtpField);
