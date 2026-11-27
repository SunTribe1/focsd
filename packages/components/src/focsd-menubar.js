import { css } from 'lit';
import { FocsdMenubarBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import './focsd-menubar-item.js';

export class FocsdMenubar extends FocsdMenubarBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdMenubarBase.styles,
    hostStyles,
    css`
    :host {
      display: flex;
      gap: var(--focsd-space-1);
      padding: var(--focsd-space-1);
      border: var(--focsd-border-width) solid var(--focsd-edge-quiet);
      border-radius: var(--focsd-radius-control);
      background: var(--focsd-surface);
      inline-size: fit-content;
    }
  `,
  ];
}

defineElement('focsd-menubar', FocsdMenubar);
