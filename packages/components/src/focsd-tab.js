import { css } from 'lit';
import { FocsdTabBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hatch, hostStyles } from '@focsd/primitives/styles/shared.js';
import { hoverMotion } from '@focsd/primitives/styles/motion.js';
import { cycleHueStyles } from '@focsd/primitives/styles/hue.js';

/**
 * @cssprop --focsd-tab-indicator - Color of the selected tab's underline (default `--focsd-action`).
 */
export class FocsdTab extends FocsdTabBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdTabBase.styles,
    cycleHueStyles,
    hostStyles,
    css`
      :host {
        display: inline-flex;
        align-items: center;
        gap: var(--focsd-space-2);
        min-block-size: var(--focsd-control-height);
        padding-inline: var(--focsd-space-4);
        margin-block-end: calc(-1 * var(--focsd-border-width));
        border-block-end: var(--focsd-selection-bar-width) solid transparent;
        border-start-start-radius: var(--focsd-radius-control);
        border-start-end-radius: var(--focsd-radius-control);
        font-size: var(--focsd-text-small-size);
        font-weight: var(--focsd-text-label-weight);
        color: var(--focsd-ink-muted);
        cursor: pointer;
        user-select: none;
      }
      :host(:hover) {
        color: var(--focsd-ink);
        background: var(--focsd-surface-sunk);
      }
      :host([aria-selected='true']) {
        color: var(--focsd-ink);
        border-block-end-color: var(--focsd-tab-indicator, var(--focsd-action));
      }
      :host([disabled]),
      :host([disabled]:hover) {
        color: var(--focsd-ink-muted);
        background: ${hatch};
        cursor: not-allowed;
      }
    `,
    hoverMotion(':host'),
  ];
}

defineElement('focsd-tab', FocsdTab);
