import { css } from 'lit';
import { FocsdBottomNavItemBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { hoverMotion } from '@focsd-dev/primitives/styles/motion.js';
import { cycleHueStyles } from '@focsd-dev/primitives/styles/hue.js';

export class FocsdBottomNavItem extends FocsdBottomNavItemBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdBottomNavItemBase.styles,
    hostStyles,
    cycleHueStyles,
    css`
      :host {
        display: block;
        flex: 1 1 0;
        min-inline-size: 0;
      }
      [part~='item'] {
        display: contents;
      }
      [part~='link'] {
        position: relative;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--focsd-space-1);
        /* 48 px targets (spec wave 21). */
        min-block-size: 48px;
        min-inline-size: 48px;
        padding: var(--focsd-space-1) var(--focsd-space-2);
        border-radius: var(--focsd-radius-control);
        color: var(--focsd-ink-muted);
        font-size: var(--focsd-text-label-size);
        line-height: var(--focsd-text-label-line-height);
        text-align: center;
        text-decoration: none;
      }
      [part~='link']:hover {
        color: var(--focsd-ink);
        background: var(--focsd-surface-sunk);
      }
      /* Current: ink text, a heavier weight and a bar along the bottom edge (like tabs and the segmented control), not color alone. */
      [part~='link'][aria-current='page'] {
        color: var(--focsd-ink);
        font-weight: var(--focsd-text-label-weight);
        box-shadow: inset 0 calc(-1 * var(--focsd-selection-bar-width)) 0 var(--focsd-action);
      }
      [part~='link']:focus-visible {
        box-shadow: var(--focsd-focus-ring-inset);
      }
      [part~='icon'] {
        display: inline-grid;
        font-size: 1.5rem;
        line-height: 1;
        /* Icons cycle through the hues in a colorful preset (Prismatic). */
        color: var(--_hue, currentColor);
      }
      /* break-word, not anywhere: whole words set the item's minimum width, so a label such as
         "Starred" never splits mid-word; only a word longer than the item itself breaks. */
      [part~='label'] {
        max-inline-size: 100%;
        overflow-wrap: break-word;
      }
      [part~='badge'] {
        position: absolute;
        inset-block-start: var(--focsd-space-1);
        inset-inline-start: calc(50% + 0.25rem);
        box-sizing: border-box;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-inline-size: 1rem;
        block-size: 1rem;
        padding-inline: 0.1875rem;
        /* As focsd-badge: ink on the critical tint (4.5:1) with a critical edge (3:1). */
        border: var(--focsd-border-width) solid var(--focsd-critical);
        border-radius: 999px;
        background: var(--focsd-critical-tint);
        color: var(--focsd-ink);
        font-size: 0.6875rem;
        font-weight: var(--focsd-text-label-weight);
        font-variant-numeric: tabular-nums;
        line-height: 1;
        white-space: nowrap;
      }
      @media (forced-colors: active) {
        [part~='link'][aria-current='page'] {
          outline: 2px solid Highlight;
          outline-offset: -2px;
        }
        [part~='badge'] {
          border-color: CanvasText;
        }
      }
    `,
    hoverMotion("[part~='link']"),
  ];
}

defineElement('focsd-bottom-nav-item', FocsdBottomNavItem);
