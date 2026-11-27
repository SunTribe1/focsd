import { css } from 'lit';
import { FocsdCardBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';

/**
 * @cssprop --focsd-card-padding - Padding inside the card (default `--focsd-space-5`).
 */
export class FocsdCard extends FocsdCardBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdCardBase.styles,
    hostStyles,
    css`
      :host {
        display: block;
      }
      [part~='card'] {
        display: grid;
        gap: var(--focsd-space-3);
        padding: var(--focsd-card-padding, var(--focsd-space-5));
        border: var(--focsd-border-width) solid var(--focsd-edge-quiet);
        border-radius: var(--focsd-radius-surface);
        background: var(--focsd-surface);
      }
      :host([variant='sunk']) [part~='card'] {
        background: var(--focsd-surface-sunk);
      }
      [hidden] {
        display: none;
      }
      ::slotted(*) {
        margin-block: 0;
      }
      [part~='footer'] {
        color: var(--focsd-ink-muted);
        font-size: var(--focsd-text-small-size);
      }
    `,
  ];
}

defineElement('focsd-card', FocsdCard);
