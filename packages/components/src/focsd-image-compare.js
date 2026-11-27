import { css } from 'lit';
import { FocsdImageCompareBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles, visuallyHidden } from '@focsd-dev/primitives/styles/shared.js';

/**
 * @cssprop --focsd-image-compare-divider-color - The divider line and handle edge (default `--focsd-surface`).
 */
export class FocsdImageCompare extends FocsdImageCompareBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdImageCompareBase.styles,
    hostStyles,
    css`
      :host {
        display: block;
        --_line: var(--focsd-image-compare-divider-color, var(--focsd-surface));
      }
      .focsd-visually-hidden {
        ${visuallyHidden}
      }
      [part~='figure'] {
        position: relative;
        display: grid;
        overflow: hidden;
        border-radius: var(--focsd-radius-surface);
        touch-action: pan-y;
        cursor: ew-resize;
        user-select: none;
      }
      :host([orientation='vertical']) [part~='figure'] {
        touch-action: pan-x;
        cursor: ns-resize;
      }
      [part~='before'],
      [part~='after'] {
        grid-area: 1 / 1;
      }
      [part~='before'] {
        clip-path: inset(0 calc(100% - var(--_position, 50%)) 0 0);
      }
      :host(:dir(rtl)) [part~='before'] {
        clip-path: inset(0 0 0 calc(100% - var(--_position, 50%)));
      }
      :host([orientation='vertical']) [part~='before'] {
        clip-path: inset(0 0 calc(100% - var(--_position, 50%)) 0);
      }
      ::slotted(img) {
        display: block;
        inline-size: 100%;
        block-size: 100%;
        object-fit: cover;
        pointer-events: none;
      }
      [part~='divider'] {
        position: absolute;
        inset-block: 0;
        inset-inline-start: var(--_position, 50%);
        inline-size: 2px;
        margin-inline-start: -1px;
        background: var(--_line);
        box-shadow: 0 0 0 1px var(--focsd-edge);
      }
      :host([orientation='vertical']) [part~='divider'] {
        inset-block: var(--_position, 50%) auto;
        inset-inline: 0;
        inline-size: auto;
        block-size: 2px;
        margin-block-start: -1px;
        margin-inline-start: 0;
      }
      [part~='handle'] {
        position: absolute;
        inset-block-start: 50%;
        inset-inline-start: 50%;
        box-sizing: border-box;
        /* The inner control size, so it follows the density (24, 28 or 36px): a clear grip that does not
           hide the pictures, never under the 24px minimum target. */
        inline-size: max(var(--focsd-control-height-inner, 1.75rem), var(--focsd-target-min, 24px));
        block-size: max(var(--focsd-control-height-inner, 1.75rem), var(--focsd-target-min, 24px));
        translate: -50% -50%;
        border: 2px solid var(--_line);
        border-radius: 50%;
        background: var(--focsd-action);
        box-shadow: var(--focsd-shadow-overlay);
      }
      :host(:dir(rtl)) [part~='handle'] {
        translate: 50% -50%;
      }
      [part~='handle']:focus-visible {
        outline: 2px solid transparent;
        box-shadow: var(--focsd-focus-ring);
      }
      @media (forced-colors: active) {
        [part~='divider'] {
          forced-color-adjust: none;
          background: CanvasText;
        }
        [part~='handle'] {
          forced-color-adjust: none;
          border-color: Canvas;
          background: Highlight;
        }
      }
    `,
  ];
}

defineElement('focsd-image-compare', FocsdImageCompare);
