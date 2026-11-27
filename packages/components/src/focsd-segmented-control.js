import { css } from 'lit';
import { FocsdSegmentedControlBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { fieldLayoutStyles } from '@focsd/primitives/styles/field-layout.js';
import './focsd-segment.js';

/**
 * @cssprop --focsd-segmented-control-background - The track behind the segments (default the sunk surface).
 */
export class FocsdSegmentedControl extends FocsdSegmentedControlBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdSegmentedControlBase.styles,
    hostStyles,
    fieldLayoutStyles,
    css`
      :host {
        display: block;
      }
      :host([size='s']) {
        --_segment-font: var(--focsd-text-small-size);
        --_segment-pad: var(--focsd-space-3);
      }
      :host([size='l']) {
        --_segment-font: var(--focsd-text-subheading-size);
        --_segment-pad: var(--focsd-space-5);
      }
      [part~='label'] {
        font-size: var(--focsd-text-small-size);
        font-weight: var(--focsd-text-label-weight);
      }
      /* With the label on top, a grid instead of the shared flex column: a flex column sizes the body
         from its narrow (stacked) layout, leaving a tall gap under one row of segments. */
      [part~='layout'][data-position='top'] {
        display: grid;
      }
      [part~='body'] {
        container-type: inline-size;
      }
      [part~='group'] {
        /* The row keeps its own height even when the host is given more (a grid or flex parent that stretches). */
        align-self: start;
        justify-self: start;
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: 1fr;
        gap: var(--focsd-space-1);
        max-inline-size: 100%;
        padding: var(--focsd-space-1);
        border: var(--focsd-border-width) solid var(--focsd-field-border-color, var(--focsd-edge-quiet));
        border-radius: var(--focsd-radius-control);
        background: var(--focsd-segmented-control-background, var(--focsd-surface-sunk));
      }
      /* Narrow containers: the segments stack, so their labels never get cut. */
      @container (max-width: 20rem) {
        [part~='group'] {
          justify-self: stretch;
          grid-auto-flow: row;
        }
      }
      @media (forced-colors: active) {
        [part~='group'] {
          border-color: CanvasText;
        }
      }
    `,
  ];
}

defineElement('focsd-segmented-control', FocsdSegmentedControl);
