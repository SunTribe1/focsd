import { css } from 'lit';
import { FocsdCodeBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import './focsd-copy-button.js';

export class FocsdCode extends FocsdCodeBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdCodeBase.styles,
    hostStyles,
    css`
    :host {
      display: block;
      border: var(--focsd-border-width) solid var(--focsd-edge-quiet);
      border-radius: var(--focsd-radius-surface);
      background: var(--focsd-surface-sunk);
    }
    [part~='header'] {
      display: flex;
      align-items: center;
      gap: var(--focsd-space-2);
      padding-block: var(--focsd-space-1);
      padding-inline: var(--focsd-space-3) var(--focsd-space-1);
      border-block-end: var(--focsd-border-width) solid var(--focsd-edge-quiet);
      font-size: var(--focsd-text-label-size);
    }
    [part~='label'] { flex: 1; font-weight: var(--focsd-text-label-weight); }
    [part~='copy']::part(button):hover { background: var(--focsd-surface); }
    [part~='viewport'] {
      margin: 0;
      padding: var(--focsd-space-4);
      overflow: auto;
      font-family: var(--focsd-font-mono);
      font-size: 0.875rem;
      line-height: 1.6;
      border-radius: 0 0 var(--focsd-radius-surface) var(--focsd-radius-surface);
    }
    [part~='viewport']:focus-visible { outline: 2px solid transparent; box-shadow: var(--focsd-focus-ring-inset); }
  `,
  ];
}

defineElement('focsd-code', FocsdCode);
