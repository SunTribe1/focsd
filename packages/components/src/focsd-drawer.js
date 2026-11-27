import { css } from 'lit';
import { FocsdDrawerBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { enterMotion } from '@focsd/primitives/styles/motion.js';
import { dialogStyles } from '@focsd/primitives/styles/dialog.js';

/**
 * @cssprop --focsd-dialog-padding - Padding inside the drawer (default `--focsd-space-6`).
 */
export class FocsdDrawer extends FocsdDrawerBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdDrawerBase.styles,
    hostStyles,
    dialogStyles,
    css`
      [part~='dialog'] {
        position: fixed;
        inset-block: 0;
        inset-inline: auto 0;
        margin: 0;
        inline-size: min(26rem, 100%);
        max-block-size: none;
        block-size: 100%;
        border-radius: 0;
        display: none;
        flex-direction: column;
      }
      [part~='dialog'][open] {
        display: flex;
      }
      /* Where the enter motion starts: just outside the drawer's own edge (enterMotion below). */
      :host {
        --_drawer-from: translateX(8%);
      }
      :host(:dir(rtl)),
      :host([placement='start']) {
        --_drawer-from: translateX(-8%);
      }
      :host([placement='start']:dir(rtl)) {
        --_drawer-from: translateX(8%);
      }
      :host([placement='bottom']) {
        --_drawer-from: translateY(8%);
      }
      :host([placement='start']) [part~='dialog'] {
        inset-inline: 0 auto;
      }
      :host([placement='bottom']) [part~='dialog'] {
        inset-block: auto 0;
        inset-inline: 0;
        inline-size: 100%;
        block-size: auto;
        max-block-size: 85vh;
        max-block-size: 85dvh;
        border-start-start-radius: var(--focsd-radius-surface);
        border-start-end-radius: var(--focsd-radius-surface);
      }
      [part~='body'] {
        flex: 1;
        overflow: auto;
        color: var(--focsd-ink);
      }
    `,
    enterMotion("[part~='dialog'][open]", { from: 'var(--_drawer-from)', duration: 'slow' }),
    enterMotion("[part~='dialog'][open]::backdrop", { from: 'none', duration: 'slow' }),
  ];
}

defineElement('focsd-drawer', FocsdDrawer);
