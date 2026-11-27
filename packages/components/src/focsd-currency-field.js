import { css } from 'lit';
import { FocsdCurrencyFieldBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { fieldStyles } from '@focsd-dev/primitives/styles/field.js';
import { fieldLayoutStyles } from '@focsd-dev/primitives/styles/field-layout.js';

export class FocsdCurrencyField extends FocsdCurrencyFieldBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdCurrencyFieldBase.styles,
    hostStyles,
    fieldStyles,
    fieldLayoutStyles,
    css`
      [part~='field'] {
        display: flex;
        align-items: center;
        box-sizing: border-box;
        min-block-size: var(--focsd-control-height);
        background: var(--focsd-field-background, var(--focsd-surface));
        border: var(--focsd-border-width) solid var(--focsd-field-border-color, var(--focsd-edge));
        border-radius: var(--focsd-field-radius, var(--focsd-radius-control));
      }
      [part~='field']:focus-within {
        border-color: var(--focsd-ink);
      }
      /* Keyboard focus rings the whole field (as on every text field), not the input inside it. */
      [part~='field']:has([part~='control']:focus-visible) {
        outline: 2px solid transparent;
        box-shadow: var(--focsd-focus-ring);
      }
      [part~='field'] [part~='control']:focus-visible {
        box-shadow: none;
      }
      [part~='field'] [part~='control'] {
        flex: 1;
        min-inline-size: 0;
        border: 0;
        background: transparent;
        font-variant-numeric: tabular-nums;
      }
      [part~='prefix'],
      [part~='suffix'] {
        padding-inline: var(--focsd-space-3) 0;
        color: var(--focsd-ink-muted);
        font-size: var(--focsd-text-body-size);
      }
      [part~='suffix'] {
        padding-inline: 0 var(--focsd-space-3);
      }
      :host([disabled]) [part~='field'] {
        color: var(--focsd-ink-muted);
        cursor: not-allowed;
      }
    `,
  ];
}

defineElement('focsd-currency-field', FocsdCurrencyField);
