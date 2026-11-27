import { css } from 'lit';
import { FocsdBottomSheetBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { closeButtonStyles } from '@focsd-dev/primitives/styles/close.js';

/**
 * @cssprop --focsd-bottom-sheet-max-width - The widest the sheet grows (default 40rem).
 * @cssprop --focsd-bottom-sheet-z - The sheet's `z-index` when it is not modal (default the dialog layer token).
 */
export class FocsdBottomSheet extends FocsdBottomSheetBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdBottomSheetBase.styles,
    hostStyles,
    closeButtonStyles,
    css`
      :host {
        display: contents;
      }
      dialog[part~='dialog'] {
        position: fixed;
        inset: 0;
        inline-size: 100%;
        block-size: 100%;
        max-inline-size: none;
        max-block-size: none;
        margin: 0;
        padding: 0;
        border: 0;
        background: transparent;
        overflow: hidden;
      }
      dialog[part~='dialog']::backdrop {
        background: var(--focsd-scrim);
      }
      section[part~='dialog'] {
        position: fixed;
        inset-inline: 0;
        inset-block-end: 0;
        /* The dialog layer, above popovers and sticky headers (Q21). */
        z-index: var(--focsd-bottom-sheet-z, var(--focsd-layer-dialog, 200));
      }
      section[part~='dialog'][hidden] {
        display: none;
      }
      [part~='panel'] {
        position: absolute;
        inset-inline: 0;
        inset-block-end: 0;
        box-sizing: border-box;
        display: grid;
        grid-template-rows: auto auto;
        align-content: start;
        block-size: var(--_sheet-height, 50vh);
        block-size: var(--_sheet-height, 50dvh);
        max-inline-size: var(--focsd-bottom-sheet-max-width, 40rem);
        margin-inline: auto;
        padding-block-end: max(var(--focsd-space-2), env(safe-area-inset-bottom));
        border: var(--focsd-border-width) solid var(--focsd-edge);
        border-block-end: 0;
        border-start-start-radius: var(--focsd-radius-surface);
        border-start-end-radius: var(--focsd-radius-surface);
        background: var(--focsd-surface-raised);
        color: var(--focsd-ink);
        box-shadow: var(--focsd-shadow-overlay);
        font-family: var(--focsd-font-sans);
        transform: translateY(var(--_offset, 0));
        transition: transform var(--focsd-duration-slow) var(--focsd-ease-move);
        pointer-events: auto;
      }
      section[part~='dialog'] [part~='panel'] {
        position: relative;
      }
      [part~='panel'][data-dragging] {
        transition: none;
      }
      [part~='header'] {
        display: grid;
        grid-template-columns: 1fr auto;
        grid-template-areas:
          'handle handle'
          'title close';
        align-items: center;
        padding-block: var(--focsd-space-1) var(--focsd-space-2);
        padding-inline: var(--focsd-space-4) var(--focsd-space-2);
        touch-action: none;
        cursor: grab;
      }
      [part~='handle'] {
        grid-area: handle;
        justify-self: center;
        display: grid;
        place-items: center;
        inline-size: 3rem;
        block-size: var(--focsd-target-min, 24px);
        border-radius: var(--focsd-radius-control);
        cursor: grab;
      }
      [part~='grip'] {
        inline-size: 2.5rem;
        block-size: 0.3125rem;
        border-radius: var(--focsd-radius-control);
        background: var(--focsd-edge);
      }
      [part~='headline'] {
        grid-area: title;
        margin: 0;
        font-size: var(--focsd-text-heading-size, 1.125rem);
        font-weight: var(--focsd-text-label-weight);
      }
      [part~='close'] {
        grid-area: close;
      }
      [part~='body'] {
        min-block-size: 0;
        max-block-size: var(--_body-height, none);
        box-sizing: border-box;
        overflow: auto;
        overscroll-behavior: contain;
        padding: 0 var(--focsd-space-4) var(--focsd-space-4);
      }
    `,
  ];
}

defineElement('focsd-bottom-sheet', FocsdBottomSheet);
