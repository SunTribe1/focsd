import { css } from 'lit';
import { FocsdAlertBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { toneStyles } from '@focsd/primitives/styles/tone.js';
import { closeButtonStyles } from '@focsd/primitives/styles/close.js';

export class FocsdAlert extends FocsdAlertBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdAlertBase.styles,
    hostStyles,
    toneStyles,
    closeButtonStyles,
    css`
      :host {
        display: block;
      }
      [part~='alert'] {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: var(--focsd-space-3);
        padding: var(--focsd-space-4);
        border: var(--focsd-border-width) solid var(--_tone-edge);
        border-radius: var(--focsd-radius-surface);
        background: var(--_tone-tint);
        color: var(--focsd-ink);
        font-size: var(--focsd-text-small-size);
        line-height: var(--focsd-text-small-line-height);
      }
      /* With a close button: icon, content, then the button in the top corner. */
      [part~='alert']:has(> [part~='close']) {
        grid-template-columns: auto 1fr auto;
        padding-block: var(--focsd-space-3);
        padding-inline-end: var(--focsd-space-3);
      }
      [part~='alert']:has(> [part~='close']) [part~='icon'] {
        padding-block-start: var(--focsd-space-1);
      }
      [part~='alert'] > [part~='close'] {
        align-self: start;
      }
      [part~='icon'] {
        color: var(--_tone-ink);
        font-size: 1.25rem;
        line-height: 1;
      }
      [part~='headline'] {
        margin: 0;
        font-weight: var(--focsd-text-label-weight);
      }
      [part~='actions'] {
        display: flex;
        flex-wrap: wrap;
        gap: var(--focsd-space-2);
      }
      [part~='actions']:not(:has(*)) {
        display: none;
      }
    `,
  ];
}

defineElement('focsd-alert', FocsdAlert);
