import { css } from 'lit';
import { FocsdCommandBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { popupBlockSize } from '@focsd-dev/primitives/styles/surface.js';
import { activeOption, groupLabel } from '@focsd-dev/primitives/styles/listbox.js';
import { dialogStyles } from '@focsd-dev/primitives/styles/dialog.js';
import { enterMotion, hoverMotion } from '@focsd-dev/primitives/styles/motion.js';
import './focsd-command-item.js';

export class FocsdCommand extends FocsdCommandBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdCommandBase.styles,
    hostStyles,
    dialogStyles,
    css`
      [part~='dialog'] {
        inline-size: min(36rem, 100% - 2 * var(--focsd-space-4));
        padding: var(--focsd-space-2);
        margin-block-start: 12vh;
        margin-block-start: 12dvh;
      }
      [part~='input'] {
        box-sizing: border-box;
        inline-size: 100%;
        min-block-size: calc(var(--focsd-control-height) + 0.5rem);
        padding-inline: var(--focsd-space-3);
        border: 0;
        border-block-end: var(--focsd-border-width) solid var(--focsd-edge-quiet);
        background: transparent;
        color: var(--focsd-ink);
        font: inherit; font-size: var(--focsd-text-subheading-size);
      }
      [part~='listbox'] { ${popupBlockSize(css`50vh`)} padding-block: var(--focsd-space-2); }
      [part~='group-label'] { ${groupLabel} }
      [part~='option'] {
        display: flex;
        align-items: center;
        gap: var(--focsd-space-2);
        min-block-size: var(--focsd-control-height);
        padding-inline: var(--focsd-space-3);
        border-radius: var(--focsd-radius-control);
        cursor: pointer;
      }
      [part~='option-label'] {
        flex: 1;
      }
      [part~='option-icon'] {
        display: inline-flex;
        flex: none;
        font-size: var(--focsd-icon-size, 1.15em);
        color: var(--_hue, var(--focsd-ink-muted));
      }
      [part~='option-icon'] > svg {
        inline-size: 1em;
        block-size: 1em;
      }
      [part~='shortcut'] {
        padding: 0.1em 0.4em;
        border: var(--focsd-border-width) solid var(--focsd-edge);
        border-radius: var(--focsd-radius-tag);
        font-family: var(--focsd-font-mono);
        font-size: var(--focsd-text-label-size);
      }
      [part~='empty'] { padding: var(--focsd-space-4); color: var(--focsd-ink-muted); }
    `,
    activeOption("[part~='active']"),
    enterMotion("[part~='dialog'][open]", { from: 'scale(0.98)', duration: 'slow' }),
    hoverMotion("[part~='option']"),
  ];
}

defineElement('focsd-command', FocsdCommand);
