import { css } from 'lit';
import { FocsdSliderBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { fieldLayoutStyles } from '@focsd-dev/primitives/styles/field-layout.js';

export class FocsdSlider extends FocsdSliderBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdSliderBase.styles,
    hostStyles,
    fieldLayoutStyles,
    css`
      :host {
        display: block;
      }
      [part~='header'] {
        display: flex;
        justify-content: space-between;
        gap: var(--focsd-space-3);
        font-size: var(--focsd-text-small-size);
      }
      [part~='layout'][data-position='top'] > [part~='header'] {
        /* Stands in for the label above the track. */
        flex: none;
      }
      [part~='layout']:not([data-position='top']) [part~='header'] {
        justify-content: flex-end;
      }
      [part~='label'] {
        font-weight: var(--focsd-text-label-weight);
      }
      [part~='output'] {
        font-family: var(--focsd-font-mono);
        color: var(--focsd-ink-muted);
      }
      [part~='track'] {
        position: relative;
        block-size: var(--focsd-control-height);
        margin-inline: 0.75rem;
        touch-action: none;
        cursor: pointer;
      }
      [part~='track']::before {
        content: '';
        position: absolute;
        inset-inline: 0;
        inset-block-start: 50%;
        block-size: 0.375rem;
        transform: translateY(-50%);
        border-radius: var(--focsd-radius-tag);
        background: var(--focsd-surface-sunk);
        box-shadow: inset 0 0 0 var(--focsd-border-width) var(--focsd-field-border-color, var(--focsd-edge));
      }
      [part~='fill'] {
        position: absolute;
        inset-block-start: 50%;
        block-size: 0.375rem;
        transform: translateY(-50%);
        border-radius: var(--focsd-radius-tag);
        /* A preset's gradient (Prismatic) when it has one; the action color otherwise. */
        background: var(--focsd-fill-gradient, var(--focsd-action));
      }
      [part~='thumb'] {
        position: absolute;
        inset-block-start: 50%;
        box-sizing: border-box;
        inline-size: 1.5rem;
        block-size: 1.5rem;
        margin-inline-start: -0.75rem;
        transform: translateY(-50%);
        border: 2px solid var(--focsd-action);
        border-radius: 50%;
        background: var(--focsd-surface);
        cursor: grab;
      }
      @media (forced-colors: active) {
        [part~='track']::before {
          border: 1px solid CanvasText;
        }
        [part~='fill'] {
          forced-color-adjust: none;
          background: Highlight;
        }
        [part~='thumb'] {
          border-color: CanvasText;
        }
      }
      [part~='thumb']:focus-visible {
        outline: 2px solid transparent;
        box-shadow: var(--focsd-focus-ring);
      }
    `,
  ];
}

defineElement('focsd-slider', FocsdSlider);
