import { css } from 'lit';
import { FocsdEditableBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { fieldStyles } from '@focsd-dev/primitives/styles/field.js';
import { fieldLayoutStyles } from '@focsd-dev/primitives/styles/field-layout.js';
import './focsd-text-field.js';
import './focsd-textarea.js';

/**
 * Editable text: click or press Enter on the value to edit it in place.
 *
 * @cssprop --focsd-editable-underline - Color of the underline shown on hover (default the muted ink).
 */
export class FocsdEditable extends FocsdEditableBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdEditableBase.styles,
    hostStyles,
    fieldStyles,
    fieldLayoutStyles,
    css`
      [part~='display'] {
        display: inline-flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--focsd-space-2);
        box-sizing: border-box;
        inline-size: 100%;
        min-block-size: var(--focsd-control-height);
        padding: 0 var(--focsd-space-1);
        font: inherit;
        font-size: var(--focsd-text-body-size);
        color: var(--focsd-ink);
        text-align: start;
        background: none;
        border: 0;
        border-radius: var(--focsd-radius-control);
        cursor: text;
      }
      [part~='value'],
      [part~='placeholder'] {
        flex: 1;
        min-inline-size: 0;
        overflow-wrap: anywhere;
        white-space: pre-wrap;
        text-decoration: underline transparent;
        text-underline-offset: 0.25em;
      }
      [part~='placeholder'] {
        color: var(--focsd-ink-muted);
      }
      [part~='display']:hover [part~='value'],
      [part~='display']:hover [part~='placeholder'] {
        text-decoration-color: var(--focsd-editable-underline, var(--focsd-ink-muted));
      }
      [part~='icon'] {
        display: inline-flex;
        color: var(--focsd-ink-muted);
      }
      [part~='icon'] svg {
        inline-size: 1rem;
        block-size: 1rem;
      }
      [part~='display']:focus-visible {
        outline: 2px solid transparent;
        box-shadow: var(--focsd-focus-ring);
      }
      [part~='display']:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      [part~='editor'] {
        inline-size: 100%;
      }
      @media (forced-colors: active) {
        [part~='display']:focus-visible {
          outline: 2px solid Highlight;
          outline-offset: 2px;
        }
      }
    `,
  ];
}

defineElement('focsd-editable', FocsdEditable);
