import { css } from 'lit';
import { FocsdSidebarItemBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { hoverMotion } from '@focsd/primitives/styles/motion.js';
import { cycleHueStyles } from '@focsd/primitives/styles/hue.js';

export class FocsdSidebarItem extends FocsdSidebarItemBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdSidebarItemBase.styles,
    hostStyles,
    cycleHueStyles,
    css`
    :host { display: block; }
    [part~='link'] {
      display: flex; align-items: center; gap: var(--focsd-space-3);
      min-block-size: var(--focsd-control-height); padding-inline: var(--focsd-space-3);
      border-radius: var(--focsd-radius-control); color: var(--focsd-ink); text-decoration: none; font-size: var(--focsd-text-small-size);
    }
    [part~='link']:hover { background: var(--focsd-surface-sunk); }
    [part~='link'][aria-current='page'] {
      background: var(--focsd-surface-sunk);
      font-weight: var(--focsd-text-label-weight);
      box-shadow: inset var(--_inline-bar) 0 0 var(--focsd-action);
    }
    /* Icons cycle through the hues in a colorful preset (Prismatic); elsewhere they keep the text color. */
    [part~='icon'] { display: inline-grid; font-size: 1.15rem; flex: none; color: var(--_hue, currentColor); }
    @media (forced-colors: active) { [part~='link'][aria-current='page'] { outline: 2px solid Highlight; outline-offset: -2px; } }
  `,
    hoverMotion("[part~='link']"),
  ];
}

defineElement('focsd-sidebar-item', FocsdSidebarItem);
