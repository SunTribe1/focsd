import { css } from 'lit';
import { FocsdMenubarItemBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { floatingSurface, popupBlockSize } from '@focsd/primitives/styles/surface.js';
import { enterMotion } from '@focsd/primitives/styles/motion.js';
import './focsd-menu-item.js';

export class FocsdMenubarItem extends FocsdMenubarItemBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdMenubarItemBase.styles,
    hostStyles,
    css`
    :host { display: inline-block; }
    [part~='trigger'] {
      anchor-name: --_menubar-anchor;
      min-block-size: var(--focsd-control-height); padding-inline: var(--focsd-space-3);
      border: 0; border-radius: var(--focsd-radius-control); background: transparent; color: var(--focsd-ink);
      font: inherit; font-size: var(--focsd-text-small-size); font-weight: var(--focsd-text-label-weight); cursor: pointer;
    }
    [part~='trigger']:hover, [part~='trigger'][aria-expanded='true'] { background: var(--focsd-surface-sunk); }
    [part~='menu'] {
      ${floatingSurface}
      position-anchor: --_menubar-anchor; position-area: block-end span-inline-end; position-try-fallbacks: flip-block;
      inset: auto; margin-block: var(--focsd-space-1); min-inline-size: 11rem; padding: var(--focsd-space-1);
      ${popupBlockSize(css`24rem`)}
    }
  `,
    enterMotion("[part~='menu']:popover-open"),
  ];
}

defineElement('focsd-menubar-item', FocsdMenubarItem);
