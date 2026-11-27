import { css } from 'lit';
import { FocsdSidebarBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import './focsd-sidebar-item.js';

export class FocsdSidebar extends FocsdSidebarBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdSidebarBase.styles,
    hostStyles,
    css`
    :host {
      display: block;
      inline-size: 15rem;
      border-inline-end: var(--focsd-border-width) solid var(--focsd-edge-quiet);
      background: var(--focsd-surface);
    }
    :host([collapsed]) { inline-size: calc(var(--focsd-control-height) + 2 * var(--focsd-space-2)); }
    [part~='nav'] { display: grid; gap: var(--focsd-space-1); padding: var(--focsd-space-2); }
    [part~='toggle'] {
      justify-self: end; display: inline-grid; place-items: center;
      min-inline-size: var(--focsd-control-height); min-block-size: var(--focsd-control-height);
      border: var(--focsd-border-width) solid var(--focsd-edge); border-radius: var(--focsd-radius-control);
      background: var(--focsd-surface); color: var(--focsd-ink); cursor: pointer;
    }
    /* Collapsed: the expand button sits centered above the icons. */
    :host([collapsed]) [part~='toggle'] { justify-self: center; }
    [part~='list'] { display: grid; gap: var(--focsd-space-1); }
  `,
  ];
}

defineElement('focsd-sidebar', FocsdSidebar);
