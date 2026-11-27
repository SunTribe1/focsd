import { css } from 'lit';
import { FocsdKbdBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';

export class FocsdKbd extends FocsdKbdBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdKbdBase.styles,
    hostStyles,
    css`
      :host {
        display: inline-block;
      }
      [part~='kbd'] {
        display: inline-block;
        min-inline-size: 1.5em;
        padding: 0.1em 0.4em;
        border: var(--focsd-border-width) solid var(--focsd-edge);
        border-block-end-width: calc(var(--focsd-border-width) * 2);
        border-radius: var(--focsd-radius-tag);
        background: var(--focsd-surface);
        font-family: var(--focsd-font-mono);
        font-size: 0.85em;
        text-align: center;
      }
    `,
  ];
}

defineElement('focsd-kbd', FocsdKbd);
