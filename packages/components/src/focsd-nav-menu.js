import { css } from 'lit';
import { FocsdNavMenuBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import './focsd-nav-item.js';

export class FocsdNavMenu extends FocsdNavMenuBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdNavMenuBase.styles,
    hostStyles,
    css`
    :host { display: block; }
    [part~='list'] { display: flex; flex-wrap: wrap; gap: var(--focsd-space-1); margin: 0; padding: 0; list-style: none; }
    :host([orientation='vertical']) [part~='list'] { flex-direction: column; flex-wrap: nowrap; align-items: stretch; }
  `,
  ];
}

defineElement('focsd-nav-menu', FocsdNavMenu);
