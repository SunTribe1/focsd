import { css } from 'lit';
import { FocsdTextareaBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { fieldStyles } from '@focsd-dev/primitives/styles/field.js';
import { fieldLayoutStyles } from '@focsd-dev/primitives/styles/field-layout.js';

export class FocsdTextarea extends FocsdTextareaBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdTextareaBase.styles,
    hostStyles,
    fieldStyles,
    fieldLayoutStyles,
    css`
      [part~='control'] {
        padding-block: var(--focsd-space-2);
        line-height: var(--focsd-text-body-line-height);
        resize: vertical;
      }
      /* Grows with its text from rows to max-rows; the padding is added so rows count lines of text.
         Engines without field-sizing keep the fixed rows height and the manual resize handle. */
      @supports (field-sizing: content) {
        :host([autosize]) [part~='control'] {
          field-sizing: content;
          resize: none;
          min-block-size: calc(var(--_rows) * 1lh + 2 * var(--focsd-space-2) + 2 * var(--focsd-border-width));
          max-block-size: calc(var(--_max-rows) * 1lh + 2 * var(--focsd-space-2) + 2 * var(--focsd-border-width));
        }
      }
      [part~='counter'] {
        margin: 0;
        color: var(--focsd-ink-muted);
        font-size: var(--focsd-text-label-size);
        text-align: end;
      }
    `,
  ];
}

defineElement('focsd-textarea', FocsdTextarea);
