import { css } from 'lit';
import { FocsdSignaturePadBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { fieldLayoutStyles } from '@focsd/primitives/styles/field-layout.js';
import { hoverMotion } from '@focsd/primitives/styles/motion.js';

/**
 * Signature pad: draw a signature, or type a name instead; submits a PNG.
 *
 * @cssprop --focsd-signature-pad-height - The drawing area's height (default 10rem).
 * @cssprop --focsd-signature-pad-ink - The pen's color on screen when `pen-color` is unset (default `--focsd-ink`).
 */
export class FocsdSignaturePad extends FocsdSignaturePadBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdSignaturePadBase.styles,
    hostStyles,
    fieldLayoutStyles,
    css`
      :host {
        display: block;
      }
      [part~='group'] {
        display: grid;
        gap: var(--focsd-space-2);
      }
      [part~='label'] {
        font-size: var(--focsd-text-small-size);
        font-weight: var(--focsd-text-label-weight);
      }
      [part~='surface'] {
        border: var(--focsd-border-width) solid var(--focsd-edge);
        border-radius: var(--focsd-radius-surface);
        background: var(--focsd-surface);
      }
      [part~='canvas'] {
        block-size: var(--focsd-signature-pad-height, 10rem);
        color: var(--focsd-signature-pad-ink, var(--focsd-ink));
        font-family: var(--focsd-font-sans);
        cursor: crosshair;
      }
      :host([typed]) [part~='canvas'] {
        cursor: default;
      }
      [part~='baseline'] {
        position: absolute;
        inset-inline: var(--focsd-space-4);
        inset-block-end: var(--focsd-space-6);
        border-block-end: var(--focsd-border-width) solid var(--focsd-edge);
        pointer-events: none;
      }
      [part~='typed-field'] {
        box-sizing: border-box;
        inline-size: 100%;
        min-block-size: var(--focsd-control-height);
        padding-inline: var(--focsd-space-3);
        font: inherit;
        color: var(--focsd-ink);
        background: var(--focsd-surface);
        border: var(--focsd-border-width) solid var(--focsd-edge);
        border-radius: var(--focsd-radius-control);
      }
      [part~='actions'] {
        display: flex;
        flex-wrap: wrap;
        gap: var(--focsd-space-2);
      }
      [part~='mode'],
      [part~='undo'],
      [part~='clear'] {
        min-block-size: var(--focsd-control-height);
        padding-inline: var(--focsd-space-4);
        border: var(--focsd-border-width) solid var(--focsd-edge);
        border-radius: var(--focsd-radius-control);
        background: var(--focsd-surface-raised);
        color: var(--focsd-ink);
        font: inherit;
        font-weight: var(--focsd-text-label-weight);
        cursor: pointer;
      }
      button:hover:not(:disabled) {
        background: var(--focsd-surface-sunk);
      }
      button:disabled {
        color: var(--focsd-ink-muted);
        cursor: not-allowed;
      }
      :host(:state(error)) [part~='surface'] {
        border-color: var(--focsd-critical);
      }
      @media (forced-colors: active) {
        [part~='canvas'] {
          color: CanvasText;
        }
        [part~='surface'],
        [part~='baseline'] {
          border-color: CanvasText;
        }
        button:disabled {
          color: GrayText;
        }
      }
    `,
    hoverMotion('button'),
  ];
}

defineElement('focsd-signature-pad', FocsdSignaturePad);
