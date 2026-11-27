import { css } from 'lit';
import { FocsdStatBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import './focsd-animated-number.js';

/**
 * Stat: a dashboard tile with a label, a large figure, the change in words with an arrow (green
 * when it is good news, red when bad) and optional chart and footer slots.
 *
 * @cssprop --focsd-stat-padding - Padding inside the tile (default `--focsd-space-5`).
 * @cssprop --focsd-stat-value-size - Font size of the figure (default `--focsd-text-heading-size`).
 */
export class FocsdStat extends FocsdStatBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdStatBase.styles,
    hostStyles,
    css`
      :host {
        display: block;
      }
      [part~='base'] {
        display: grid;
        align-content: start;
        gap: var(--focsd-space-2);
        block-size: 100%;
        box-sizing: border-box;
        padding: var(--focsd-stat-padding, var(--focsd-space-5));
        border: var(--focsd-border-width) solid var(--focsd-edge-quiet);
        border-radius: var(--focsd-radius-surface);
        background: var(--focsd-surface);
      }
      [part~='label'] {
        color: var(--focsd-ink-muted);
        font-size: var(--focsd-text-label-size);
        font-weight: var(--focsd-text-label-weight);
        line-height: var(--focsd-text-label-line-height);
      }
      [part~='label'] a {
        color: var(--focsd-route);
        text-underline-offset: 0.2em;
      }
      [part~='value'] {
        font-size: var(--focsd-stat-value-size, var(--focsd-text-heading-size));
        font-weight: var(--focsd-text-heading-weight);
        line-height: var(--focsd-text-heading-line-height);
        letter-spacing: var(--focsd-text-heading-tracking);
        font-variant-numeric: tabular-nums;
        overflow-wrap: break-word;
      }
      [part~='delta'] {
        display: flex;
        align-items: start;
        gap: var(--focsd-space-1);
        color: var(--focsd-ink-muted);
        font-size: var(--focsd-text-small-size);
        line-height: var(--focsd-text-small-line-height);
      }
      [part~='delta'][data-judgement='good'] {
        color: var(--focsd-positive);
      }
      [part~='delta'][data-judgement='bad'] {
        color: var(--focsd-critical);
      }
      [part~='delta-icon'] {
        flex: none;
        inline-size: 1em;
        /* One line tall, so the arrow sits on the first line of a delta that wraps. */
        block-size: 1lh;
        fill: none;
        stroke: currentColor;
        stroke-width: 2.5;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      [part~='footer'] {
        color: var(--focsd-ink-muted);
        font-size: var(--focsd-text-small-size);
      }
      [hidden] {
        display: none;
      }
    `,
  ];
}

defineElement('focsd-stat', FocsdStat);
