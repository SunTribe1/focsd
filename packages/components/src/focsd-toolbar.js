import { css } from 'lit';
import { FocsdToolbarBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';

export class FocsdToolbar extends FocsdToolbarBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdToolbarBase.styles,
    hostStyles,
    css`
    :host { display: inline-block; }
    [part~='toolbar'] {
      display: flex;
      flex-wrap: wrap;
      gap: var(--focsd-space-1);
      padding: var(--focsd-space-1);
      border: var(--focsd-border-width) solid var(--focsd-edge-quiet);
      border-radius: var(--focsd-radius-control);
      background: var(--focsd-surface);
    }
    :host([orientation='vertical']) [part~='toolbar'] { flex-direction: column; }
  `,
  ];
}

defineElement('focsd-toolbar', FocsdToolbar);
