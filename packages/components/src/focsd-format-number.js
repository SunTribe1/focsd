import { css } from 'lit';
import { FocsdFormatNumberBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';

/**
 * Format number: shows a number as text for the reader's locale (decimal, currency, percent, unit or bytes),
 * inside a `<data>` element whose `value` is the raw number. It takes the surrounding font and color.
 */
export class FocsdFormatNumber extends FocsdFormatNumberBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdFormatNumberBase.styles,
    css`
      :host {
        display: inline;
      }
      :host([hidden]) {
        display: none;
      }
    `,
  ];
}

defineElement('focsd-format-number', FocsdFormatNumber);
