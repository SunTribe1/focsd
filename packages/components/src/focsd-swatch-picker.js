import { css } from 'lit';
import { FocsdSwatchPickerBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { fieldStyles } from '@focsd/primitives/styles/field.js';
import { fieldLayoutStyles } from '@focsd/primitives/styles/field-layout.js';
import { floatingSurface } from '@focsd/primitives/styles/surface.js';
import './focsd-color-picker.js';
import './focsd-option.js';

/**
 * Swatch picker: a color radio group with an optional custom color.
 *
 * @cssprop --focsd-swatch-picker-size - Width and height of a swatch's color chip (default 2rem). Each swatch is a target of at least 2.75rem (44px) around its chip.
 */
export class FocsdSwatchPicker extends FocsdSwatchPickerBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdSwatchPickerBase.styles,
    hostStyles,
    fieldStyles,
    fieldLayoutStyles,
    css`
      /* Targets touch: the 44px hit areas already leave 12px between 32px chips. */
      :host {
        --_chip: var(--focsd-swatch-picker-size, 2rem);
        --_target: max(2.75rem, var(--_chip));
      }
      /* The row reaches past its box by the target's margin, so the chips line up with the label; only
         that hit-area margin can be cut off at a clipping container's edge, never a chip. The custom color
         button stays beside the swatches: when they wrap, it ends their last row. */
      [part~='row'] {
        display: flex;
        align-items: flex-end;
        margin-inline: calc((var(--_chip) - var(--_target)) / 2);
      }
      [part~='group'] {
        display: flex;
        flex-wrap: wrap;
        min-inline-size: 0;
      }
      [part~='custom'] {
        flex: none;
      }
      [part~='swatch'],
      [part~='custom'] {
        position: relative;
        box-sizing: border-box;
        inline-size: var(--_target);
        block-size: var(--_target);
        padding: 0;
        color: var(--focsd-ink);
        background: none;
        border: 0;
        border-radius: var(--focsd-radius-control);
        cursor: pointer;
      }
      /* The chip is the visible swatch, centered in a 44px target. */
      [part~='chip'] {
        position: absolute;
        inset: calc((var(--_target) - var(--_chip)) / 2);
        border-radius: inherit;
        border: var(--focsd-border-width) solid var(--focsd-edge);
        background: var(--_swatch-color, var(--focsd-surface));
      }
      [part~='custom']:not([data-custom]) [part~='chip'] {
        background: var(--focsd-surface);
        border-style: dashed;
      }
      [part~='check'],
      [part~='icon'] {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        pointer-events: none;
      }
      [part~='check'] svg,
      [part~='icon'] svg {
        box-sizing: content-box;
        inline-size: 0.875rem;
        block-size: 0.875rem;
        padding: 2px;
        border-radius: 50%;
        background: var(--focsd-surface);
        color: var(--focsd-ink);
      }
      [part~='swatch'][aria-checked='true'] [part~='chip'] {
        box-shadow:
          0 0 0 2px var(--focsd-surface),
          0 0 0 4px var(--focsd-ink);
      }
      [part~='swatch']:focus-visible,
      [part~='custom']:focus-visible {
        outline: none;
      }
      [part~='swatch']:focus-visible [part~='chip'],
      [part~='custom']:focus-visible [part~='chip'] {
        outline: 2px solid transparent;
        box-shadow: var(--focsd-focus-ring);
      }
      [part~='swatch'][aria-checked='true']:focus-visible [part~='chip'] {
        box-shadow:
          0 0 0 2px var(--focsd-surface),
          0 0 0 4px var(--focsd-ink),
          var(--focsd-focus-ring);
      }
      [part~='swatch'][aria-disabled='true'],
      [part~='swatch']:disabled,
      [part~='custom']:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      [part~='popup'][popover] {
        ${floatingSurface}
        position-anchor: --_swatch-anchor;
        position-area: block-end span-inline-end;
        position-try-fallbacks: flip-block, flip-inline;
        inset: auto;
        margin-block: var(--focsd-space-2);
        padding: var(--focsd-space-4);
      }
      [part~='custom'] {
        anchor-name: --_swatch-anchor;
      }
      @media (forced-colors: active) {
        [part~='chip'] {
          forced-color-adjust: none;
          border-color: CanvasText;
        }
        [part~='check'] svg {
          forced-color-adjust: none;
          background: Canvas;
          color: CanvasText;
        }
        [part~='swatch'][aria-checked='true'] [part~='chip'] {
          outline: 3px solid Highlight;
          outline-offset: 2px;
        }
        [part~='swatch']:focus-visible [part~='chip'],
        [part~='custom']:focus-visible [part~='chip'] {
          outline: 2px solid Highlight;
          outline-offset: 4px;
        }
      }
    `,
  ];
}

defineElement('focsd-swatch-picker', FocsdSwatchPicker);
