import { css } from 'lit';
import { FocsdFloatingPanelBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { closeButtonStyles } from '@focsd-dev/primitives/styles/close.js';
import { floatingSurface } from '@focsd-dev/primitives/styles/surface.js';
import { enterMotion, hoverMotion } from '@focsd-dev/primitives/styles/motion.js';

/**
 * @cssprop --focsd-floating-panel-width - Inline size of the panel (default 22rem, never wider than the viewport less a margin).
 */
export class FocsdFloatingPanel extends FocsdFloatingPanelBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdFloatingPanelBase.styles,
    hostStyles,
    closeButtonStyles,
    css`
      :host {
        display: contents;
      }
      [part~='panel'] {
        ${floatingSurface}
        display: none;
        flex-direction: column;
        inline-size: var(--focsd-floating-panel-width, min(22rem, 100vw - 2 * var(--focsd-space-4)));
        max-block-size: calc(100dvh - 2 * var(--focsd-space-4));
        padding: 0;
        overflow: hidden;
        font-size: var(--focsd-text-body-size);
        line-height: var(--focsd-text-body-line-height);
      }
      [part~='panel']:popover-open {
        display: flex;
      }
      [part~='header'] {
        display: flex;
        align-items: center;
        gap: var(--focsd-space-1);
        padding-block: var(--focsd-space-1);
        padding-inline: var(--focsd-space-4) var(--focsd-space-1);
        border-block-end: var(--focsd-border-width) solid var(--focsd-edge-quiet);
        cursor: grab;
      }
      [part~='header']:active {
        cursor: grabbing;
      }
      [part~='title'] {
        flex: 1;
        min-inline-size: 0;
        margin: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: var(--focsd-text-body-size);
        font-weight: var(--focsd-text-label-weight);
        line-height: var(--focsd-text-body-line-height);
      }
      [part~='move-handle'] {
        display: inline-grid;
        place-items: center;
        min-inline-size: var(--focsd-control-height);
        min-block-size: var(--focsd-control-height);
        padding: 0;
        border: var(--focsd-border-width) solid transparent;
        border-radius: var(--focsd-radius-control);
        background: transparent;
        color: var(--focsd-ink-muted);
        font: inherit;
        font-size: 1.1rem;
        cursor: pointer;
      }
      [part~='move-handle'] {
        cursor: move;
      }
      [part~='move-handle']:hover {
        background: var(--focsd-surface-sunk);
        color: var(--focsd-ink);
      }
      [part~='body'] {
        padding: var(--focsd-space-4);
        overflow: auto;
        overscroll-behavior: contain;
      }
      [part~='body'] ::slotted(:first-child) {
        margin-block-start: 0;
      }
      [part~='body'] ::slotted(:last-child) {
        margin-block-end: 0;
      }
    `,
    hoverMotion("[part~='move-handle'], [part~='close']"),
    enterMotion("[part~='panel']:popover-open", { from: 'scale(0.98)' }),
  ];
}

defineElement('focsd-floating-panel', FocsdFloatingPanel);
