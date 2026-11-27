import { css } from 'lit';
import { FocsdColorPickerBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { floatingSurface } from '@focsd-dev/primitives/styles/surface.js';
import { enterMotion } from '@focsd-dev/primitives/styles/motion.js';
import { fieldLayoutStyles } from '@focsd-dev/primitives/styles/field-layout.js';

/** Checkerboard behind translucent colors, so opacity is visible. */
const checker = css`repeating-conic-gradient(var(--focsd-surface-sunk) 0% 25%, var(--focsd-surface) 0% 50%) 0 0 / 0.75rem 0.75rem`;

/**
 * @cssprop --focsd-color-picker-width - The widest the picker grows (default 15rem, never wider than its container).
 * @cssprop --focsd-color-picker-area-height - Height of the saturation and brightness area (default 10rem).
 */
export class FocsdColorPicker extends FocsdColorPickerBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdColorPickerBase.styles,
    hostStyles,
    fieldLayoutStyles,
    css`
      :host {
        display: inline-grid;
        max-inline-size: 100%;
      }
      :host([inline]),
      :host([label-position='start']),
      :host([label-position='end']) {
        display: grid;
      }
      [part~='label'] {
        font-size: var(--focsd-text-small-size);
        font-weight: var(--focsd-text-label-weight);
        line-height: var(--focsd-text-small-line-height);
      }
      [part~='trigger'] {
        box-sizing: border-box;
        justify-self: start;
        display: inline-flex;
        align-items: center;
        gap: var(--focsd-space-2);
        min-block-size: var(--focsd-control-height);
        padding-inline: var(--focsd-space-2) var(--focsd-space-3);
        font: inherit;
        font-family: var(--focsd-font-mono);
        font-size: var(--focsd-text-small-size);
        color: var(--focsd-ink);
        background: var(--focsd-field-background, var(--focsd-surface));
        border: var(--focsd-border-width) solid var(--focsd-field-border-color, var(--focsd-edge));
        border-radius: var(--focsd-field-radius, var(--focsd-radius-control));
        cursor: pointer;
      }
      [part~='trigger']:disabled {
        color: var(--focsd-ink-muted);
        cursor: not-allowed;
      }
      [part~='swatch'] {
        inline-size: 1.5rem;
        block-size: 1.5rem;
        border-radius: var(--focsd-radius-control);
        border: var(--focsd-border-width) solid var(--focsd-edge);
        background:
          linear-gradient(var(--_color-current), var(--_color-current)),
          ${checker};
      }
      [part~='panel'][popover] {
        ${floatingSurface}
        position-anchor: --_color-anchor;
        position-area: block-end span-inline-end;
        position-try-fallbacks: flip-block, flip-inline;
        inset: auto;
        margin-block: var(--focsd-space-2);
        padding: var(--focsd-space-4);
      }
      [part~='trigger'] {
        anchor-name: --_color-anchor;
      }
      [part~='controls'] {
        display: grid;
        gap: var(--focsd-space-3);
        inline-size: min(var(--focsd-color-picker-width, 15rem), 100%);
      }
      [part~='area'] {
        position: relative;
        block-size: var(--focsd-color-picker-area-height, 10rem);
        border-radius: var(--focsd-radius-control);
        cursor: crosshair;
      }
      [part~='area-thumb'],
      [part~='thumb'] {
        position: absolute;
        inline-size: 1.25rem;
        block-size: 1.25rem;
        box-sizing: border-box;
        border-radius: 50%;
        border: 2px solid var(--focsd-ground);
        box-shadow: 0 0 0 2px var(--focsd-ink);
        translate: -50% -50%;
        pointer-events: none;
      }
      [part~='area-thumb'] {
        inset-inline-start: var(--_color-s);
        top: var(--_color-v);
        background: var(--_color-opaque);
      }
      :host(:dir(rtl)) [part~='area-thumb'],
      :host(:dir(rtl)) [part~='thumb'] {
        translate: 50% -50%;
      }
      [part~='hue'],
      [part~='alpha'] {
        block-size: 0.875rem;
        border-radius: var(--focsd-radius-tag);
        cursor: pointer;
      }
      [part~='alpha'] {
        background:
          linear-gradient(to right, transparent, var(--_color-opaque)),
          ${checker};
      }
      :host(:dir(rtl)) [part~='alpha'] {
        background:
          linear-gradient(to left, transparent, var(--_color-opaque)),
          ${checker};
      }
      [part~='hue'] [part~='thumb'] {
        inset-inline-start: var(--_color-h-pos);
        top: 50%;
        background: var(--_color-pure-hue);
      }
      [part~='alpha'] [part~='thumb'] {
        inset-inline-start: var(--_color-a);
        top: 50%;
        background: var(--_color-current);
      }
      [part~='field-row'] {
        display: flex;
        gap: var(--focsd-space-2);
      }
      [part~='field'] {
        box-sizing: border-box;
        flex: 1;
        min-inline-size: 0;
        min-block-size: var(--focsd-control-height);
        padding-inline: var(--focsd-space-3);
        font: inherit;
        font-family: var(--focsd-font-mono);
        font-size: var(--focsd-text-small-size);
        color: var(--focsd-ink);
        background: var(--focsd-field-background, var(--focsd-surface));
        border: var(--focsd-border-width) solid var(--focsd-field-border-color, var(--focsd-edge));
        border-radius: var(--focsd-field-radius, var(--focsd-radius-control));
      }
      [part~='field'][aria-invalid='true'] {
        border-color: var(--focsd-critical);
      }
      [part~='eyedropper'] {
        display: inline-grid;
        place-items: center;
        inline-size: var(--focsd-control-height);
        block-size: var(--focsd-control-height);
        padding: 0;
        color: var(--focsd-ink);
        background: var(--focsd-surface);
        border: var(--focsd-border-width) solid var(--focsd-edge);
        border-radius: var(--focsd-radius-control);
        cursor: pointer;
      }
      [part~='eyedropper'] svg {
        inline-size: 1.125rem;
        block-size: 1.125rem;
      }
      [part~='swatches'] {
        display: flex;
        flex-wrap: wrap;
        gap: var(--focsd-space-2);
      }
      [part~='swatch-option'] {
        inline-size: 1.75rem;
        block-size: 1.75rem;
        padding: 0;
        border-radius: var(--focsd-radius-control);
        border: var(--focsd-border-width) solid var(--focsd-edge);
        background:
          linear-gradient(var(--_color-swatch), var(--_color-swatch)),
          ${checker};
        cursor: pointer;
      }
      [part~='swatch-option'][aria-checked='true'] {
        box-shadow:
          0 0 0 2px var(--focsd-surface-raised),
          0 0 0 4px var(--focsd-ink);
      }
      [part~='contrast'] {
        margin: 0;
        font-size: var(--focsd-text-label-size);
        line-height: var(--focsd-text-label-line-height);
        color: var(--focsd-ink-muted);
      }
      [aria-disabled='true'] {
        opacity: 0.5;
        cursor: not-allowed;
      }
      @media (forced-colors: active) {
        [part~='area-thumb'],
        [part~='thumb'] {
          border-color: CanvasText;
          forced-color-adjust: none;
        }
      }
    `,
    enterMotion("[part~='panel']:popover-open"),
  ];
}

defineElement('focsd-color-picker', FocsdColorPicker);
