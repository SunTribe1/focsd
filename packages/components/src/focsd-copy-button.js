import { css } from 'lit';
import { FocsdCopyButtonBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';

/** Copy button: an icon button that copies `value` (or the `from` element's text) and says "Copied". */
export class FocsdCopyButton extends FocsdCopyButtonBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdCopyButtonBase.styles,
    hostStyles,
    css`
      :host {
        display: inline-block;
        vertical-align: middle;
      }
      [part~='button'] {
        display: inline-grid;
        place-items: center;
        box-sizing: border-box;
        min-inline-size: var(--focsd-control-height);
        min-block-size: var(--focsd-control-height);
        padding: 0;
        border: 0;
        border-radius: var(--focsd-radius-control);
        background: transparent;
        color: var(--focsd-ink);
        font-size: 1.1rem;
        cursor: pointer;
      }
      [part~='button']:hover {
        background: var(--focsd-surface-sunk);
      }
      [part~='icon'] {
        display: inline-grid;
      }
      @media (forced-colors: active) {
        [part~='button'] {
          border: 1px solid ButtonText;
        }
      }
    `,
  ];
}

defineElement('focsd-copy-button', FocsdCopyButton);
