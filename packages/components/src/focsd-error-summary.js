import { css } from 'lit';
import { FocsdErrorSummaryBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';

export class FocsdErrorSummary extends FocsdErrorSummaryBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdErrorSummaryBase.styles,
    hostStyles,
    css`
      :host {
        display: block;
        padding: var(--focsd-space-5);
        border: var(--focsd-border-width) solid var(--focsd-critical);
        border-radius: var(--focsd-radius-surface);
        background: var(--focsd-surface);
      }
      :host(:focus-visible) {
        outline: 2px solid transparent;
      }
      [part~='headline'] {
        margin: 0 0 var(--focsd-space-3);
        font-size: var(--focsd-text-subheading-size);
      }
      [part~='list'] {
        margin: 0;
        padding-inline-start: var(--focsd-space-5);
      }
      [part~='link'] {
        color: var(--focsd-critical);
        font-weight: var(--focsd-text-label-weight);
        text-decoration: underline;
      }
    `,
  ];
}

defineElement('focsd-error-summary', FocsdErrorSummary);
