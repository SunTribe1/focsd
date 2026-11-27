import { css } from 'lit';
import { FocsdPopoverBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { floatingSurface } from '@focsd/primitives/styles/surface.js';
import { enterMotion } from '@focsd/primitives/styles/motion.js';
import { anchored } from '@focsd/primitives/styles/menu.js';
import { closeButtonStyles } from '@focsd/primitives/styles/close.js';

export class FocsdPopover extends FocsdPopoverBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdPopoverBase.styles,
    hostStyles,
    anchored(css`--_popover-anchor`),
    closeButtonStyles,
    css`
      /* With \`closable\`, the close button sits in the top corner and the content leaves it room. */
      [part~='panel']:has(> [part~='close']) {
        padding-inline-end: calc(var(--focsd-control-height) + var(--focsd-space-3));
      }
      [part~='panel'] > [part~='close'] {
        position: absolute;
        inset-block-start: var(--focsd-space-2);
        inset-inline-end: var(--focsd-space-2);
      }
      :host {
        display: inline-block;
      }
      [part~='panel'] {
        ${floatingSurface}
        position-anchor: --_popover-anchor;
        position-area: block-end span-inline-end;
        position-try-fallbacks: flip-block, flip-inline;
        inset: auto;
        margin-block: var(--focsd-space-2);
        min-inline-size: 16rem;
        max-inline-size: min(28rem, 100vw - 2rem);
        /* Never taller than what is visible (the on-screen keyboard shrinks it); scroll inside. */
        max-block-size: calc(min(100vh, var(--_focsd-visual-viewport-height, 100vh)) - 2 * var(--focsd-space-2));
        overflow: auto;
        overscroll-behavior: contain;
        padding: var(--focsd-space-4);
      }
      [part~='panel']:popover-open {
        display: grid;
        gap: var(--focsd-space-3);
      }
    `,
    enterMotion("[part~='panel']:popover-open"),
  ];
}

defineElement('focsd-popover', FocsdPopover);
