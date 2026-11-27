import { css } from 'lit';
import { FocsdPhoneFieldBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { fieldStyles } from '@focsd-dev/primitives/styles/field.js';
import { comboStyles } from '@focsd-dev/primitives/styles/combo.js';
import { fieldLayoutStyles } from '@focsd-dev/primitives/styles/field-layout.js';
import { enterMotion, hoverMotion } from '@focsd-dev/primitives/styles/motion.js';

export class FocsdPhoneField extends FocsdPhoneFieldBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdPhoneFieldBase.styles,
    hostStyles,
    fieldStyles,
    comboStyles,
    fieldLayoutStyles,
    css`
      [part~='field'] {
        display: flex;
        flex-wrap: nowrap;
        align-items: stretch;
        gap: 0;
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
      [part~='field']:has(:is([part~='control'], [part~='country']):focus-visible) {
        outline: 2px solid transparent;
        box-shadow: var(--focsd-focus-ring);
      }
      [part~='field'] :is([part~='control'], [part~='country']):focus-visible {
        box-shadow: none;
      }
      [part~='flag'] {
        display: grid;
        place-items: center;
        padding-inline-start: var(--focsd-space-2);
        font-size: 1.125rem;
      }
      [part~='country'],
      [part~='field'] [part~='control'] {
        box-sizing: border-box;
        min-inline-size: 0;
        padding-inline: var(--focsd-space-2);
        font: inherit;
        font-size: var(--focsd-text-body-size);
        color: var(--focsd-ink);
        background: transparent;
        border: 0;
      }
      [part~='country'] {
        /* Fits the compact code (US +1, GB +44, IE +353); typing a name searches every country. */
        flex: 0 0 7.5ch;
        inline-size: 7.5ch;
        border-inline-end: var(--focsd-border-width) solid var(--focsd-edge-quiet);
        text-overflow: ellipsis;
      }
      [part~='field'] [part~='control'] {
        flex: 1;
        min-inline-size: 8rem;
        font-variant-numeric: tabular-nums;
      }
      [part~='example'] {
        margin: 0;
        font-size: var(--focsd-text-label-size);
        line-height: var(--focsd-text-label-line-height);
        color: var(--focsd-ink-muted);
      }
      [part~='option'] {
        gap: var(--focsd-space-2);
      }
      [part~='option-dial'] {
        margin-inline-start: auto;
        color: var(--focsd-ink-muted);
        font-variant-numeric: tabular-nums;
      }
      /* field.js styles the inner input for an error; the error shows on the outer box instead. */
      @supports not selector(:state(error)) {
        :host([error]:not([error=''])) [part~='field'] [part~='control'] {
          padding-inline: var(--focsd-space-2);
          border-width: 0;
        }
      }
      :host(:state(error)) [part~='field'] [part~='control'] {
        padding-inline: var(--focsd-space-2);
        border-width: 0;
      }
      :host([disabled]) [part~='field'] {
        color: var(--focsd-ink-muted);
        cursor: not-allowed;
      }
    `,
    enterMotion("[part~='popup']:popover-open"),
    hoverMotion("[part~='option']"),
  ];
}

defineElement('focsd-phone-field', FocsdPhoneField);
