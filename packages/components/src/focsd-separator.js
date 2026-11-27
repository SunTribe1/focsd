import { css } from 'lit';
import { FocsdSeparatorBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';

/**
 * @cssprop --focsd-separator-color - The line's color (default `--focsd-edge`).
 */
export class FocsdSeparator extends FocsdSeparatorBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdSeparatorBase.styles,
    hostStyles,
    css`
      :host {
        display: block;
        margin-block: var(--focsd-space-3);
      }
      :host([orientation='vertical']) {
        display: inline-block;
        align-self: stretch;
        vertical-align: middle;
        margin-block: 0;
        margin-inline: var(--focsd-space-3);
      }
      [part~='line'] {
        block-size: var(--focsd-border-width);
        background: var(--focsd-separator-color, var(--focsd-edge));
      }
      :host([orientation='vertical']) [part~='line'] {
        inline-size: var(--focsd-border-width);
        block-size: 100%;
        min-block-size: 1.25em;
      }
    `,
  ];
}

defineElement('focsd-separator', FocsdSeparator);
