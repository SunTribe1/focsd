import { css } from 'lit';
import { closeButtonStyles } from './close.js';

/** Dialog visuals shared by focsd-dialog, focsd-alert-dialog and focsd-drawer. */
export const dialogStyles = css`
      ${closeButtonStyles}
      :host {
        display: contents;
      }
      [part~='dialog'] {
        box-sizing: border-box;
        inline-size: min(32rem, 100% - 2 * var(--focsd-space-4));
        max-block-size: calc(100% - 2 * var(--focsd-space-6));
        padding: var(--focsd-dialog-padding, var(--focsd-space-6));
        border: var(--focsd-border-width) solid var(--focsd-edge);
        border-radius: var(--focsd-radius-surface);
        background: var(--focsd-surface-raised);
        color: var(--focsd-ink);
        box-shadow: var(--focsd-shadow-overlay);
        font-family: var(--focsd-font-sans);
        font-size: var(--focsd-text-body-size);
        line-height: var(--focsd-text-body-line-height);
      }
      [part~='dialog']::backdrop {
        background: var(--focsd-scrim);
      }
      /* The close button sits in the top corner; the headline leaves it room. */
      [part~='dialog'] > [part~='close'] {
        position: absolute;
        inset-block-start: var(--focsd-space-3);
        inset-inline-end: var(--focsd-space-3);
      }
      [part~='dialog']:has(> [part~='close']) [part~='headline'] {
        padding-inline-end: calc(var(--focsd-control-height) + var(--focsd-space-2));
      }
      [part~='headline'] {
        margin: 0 0 var(--focsd-space-3);
        font-size: var(--focsd-text-subheading-size);
        font-weight: var(--focsd-text-subheading-weight);
        line-height: var(--focsd-text-subheading-line-height);
        letter-spacing: var(--focsd-text-subheading-tracking);
      }
      [part~='body'] {
        color: var(--focsd-ink-muted);
      }
      [part~='body'] ::slotted(*) {
        margin-block: 0;
      }
      [part~='actions'] {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: var(--focsd-space-3);
        margin-block-start: var(--focsd-space-5);
      }
`;
