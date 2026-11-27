import { css } from 'lit';
import { FocsdSegmentBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { hoverTransition } from '@focsd/primitives/styles/motion.js';
import { cycleHueStyles } from '@focsd/primitives/styles/hue.js';

export class FocsdSegment extends FocsdSegmentBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdSegmentBase.styles,
    cycleHueStyles,
    hostStyles,
    css`
      :host {
        box-sizing: border-box;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--focsd-space-2);
        /* At least 44 px tall at every size (WCAG 2.5.5 target size). */
        min-block-size: max(44px, var(--focsd-control-height));
        min-inline-size: 44px;
        padding-inline: var(--_segment-pad, var(--focsd-space-4));
        border: var(--focsd-border-width) solid transparent;
        border-radius: var(--focsd-radius-control);
        color: var(--focsd-ink);
        font-size: var(--_segment-font, var(--focsd-text-body-size));
        font-weight: var(--focsd-text-body-weight);
        text-align: center;
        cursor: pointer;
        user-select: none;
        ${hoverTransition()}
      }
      :host(:hover:not([aria-checked='true']):not([disabled])) {
        background: var(--focsd-surface);
      }
      /* Selected: a filled surface, an edge and a heavier weight, so color is never the only cue. */
      :host([aria-checked='true']) {
        background: var(--focsd-surface-raised, var(--focsd-surface));
        border-color: var(--focsd-ink);
        font-weight: var(--focsd-text-label-weight);
      }
      :host([disabled]) {
        color: var(--focsd-ink-muted);
        cursor: not-allowed;
      }
      [part~='icon'] {
        display: inline-grid;
        font-size: 1.15em;
        flex: none;
      }
      @media (forced-colors: active) {
        :host([aria-checked='true']) {
          forced-color-adjust: none;
          background: SelectedItem;
          color: SelectedItemText;
          border-color: SelectedItem;
        }
        :host([disabled]) {
          color: GrayText;
        }
      }
    `,
  ];
}

defineElement('focsd-segment', FocsdSegment);
