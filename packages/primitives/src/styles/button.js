import { css } from 'lit';
import { hatch } from './shared.js';
import { hoverTransition } from './motion.js';

/** Button visuals, shared with focsd-toggle and focsd-icon-button. */
export const buttonStyles = css`
      :host {
        display: inline-block;
      }
      [part~='control'] {
        box-sizing: border-box;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--focsd-space-2);
        inline-size: 100%;
        min-block-size: var(--focsd-control-height);
        padding-inline: var(--focsd-space-inline-control);
        font: inherit;
        font-size: var(--focsd-text-small-size);
        font-weight: var(--focsd-text-label-weight);
        line-height: var(--focsd-text-small-line-height);
        border: var(--focsd-border-width) solid var(--focsd-button-border-color, var(--focsd-edge));
        border-radius: var(--focsd-button-radius, var(--focsd-radius-control));
        background: var(--focsd-button-background, var(--focsd-surface));
        color: var(--focsd-button-color, var(--focsd-ink));
        cursor: pointer;
        ${hoverTransition({ press: true })}
      }
      [part~='control']:active:not([aria-disabled='true']) {
        transform: scale(0.98);
      }
      [part~='control']:hover {
        background: var(--focsd-button-background-hover, var(--focsd-surface-sunk));
      }
      :host([variant='action']) [part~='control'] {
        background: var(--focsd-button-background, var(--focsd-action));
        border-color: var(--focsd-button-border-color, var(--focsd-action));
        color: var(--focsd-button-color, var(--focsd-on-action));
      }
      :host([variant='action']) [part~='control']:hover {
        background: var(--focsd-button-background-hover, var(--focsd-action-hover));
        border-color: var(--focsd-action-hover);
      }
      :host([variant='action']) [part~='control']:active {
        background: var(--focsd-action-press);
        border-color: var(--focsd-action-press);
      }
      :host([variant='quiet']) [part~='control'] {
        background: transparent;
        border-color: transparent;
        text-decoration: underline;
        text-underline-offset: 0.2em;
      }
      :host([variant='quiet']) [part~='control']:hover {
        text-decoration-thickness: 2px;
      }
      :host([variant='critical']) [part~='control'] {
        background: var(--focsd-surface);
        border-color: var(--focsd-critical);
        color: var(--focsd-critical);
      }
      :host([variant='critical']) [part~='control']:hover {
        background: var(--focsd-critical-tint);
      }
      :host([disabled]) [part~='control'],
      :host(:disabled) [part~='control'],
      :host(:disabled) [part~='control']:hover,
      :host([disabled]) [part~='control']:hover,
      :host([disabled]) [part~='control']:active {
        cursor: not-allowed;
        color: var(--focsd-ink-muted);
        border-color: var(--focsd-edge);
        background: ${hatch};
        text-decoration: none;
      }
`;
