import { css } from 'lit';
import { brands, defaultSwatches, presetSwatches, setBrand } from '@focsd-dev/tokens';
import { FocsdThemePickerBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';

/**
 * Theme picker: the theme presets as a radio group of cards, each with its name, a swatch of its
 * action, route and surface colors in the current scheme, and a check mark when chosen. It sets
 * `data-focsd-brand` on `<html>` (or `target`) and stores the choice under `focsd-brand`; load
 * `@focsd-dev/tokens/presets.css` (or the presets you offer) for the colors to change.
 *
 * @cssprop --focsd-theme-picker-min-width - Smallest width of a card before the grid wraps (default 10rem).
 */
export class FocsdThemePicker extends FocsdThemePickerBase {
  /** @override */
  static brandApi = { brands, setBrand, presetSwatches, defaultSwatches };

  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdThemePickerBase.styles,
    hostStyles,
    css`
      :host {
        display: block;
      }
      [part~='group'] {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--focsd-theme-picker-min-width, 10rem)), 1fr));
        gap: var(--focsd-space-2);
      }
      [part~='option'] {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        gap: var(--focsd-space-2);
        min-block-size: var(--focsd-target-min);
        padding: var(--focsd-space-3);
        border: var(--focsd-border-width) solid var(--focsd-edge);
        border-radius: var(--focsd-radius-surface);
        background: var(--focsd-surface);
        color: var(--focsd-ink);
        cursor: pointer;
        user-select: none;
      }
      [part~='option']:hover {
        background: var(--focsd-surface-sunk);
      }
      [part~='option-checked'] {
        border-color: var(--focsd-ink);
        box-shadow: inset 0 0 0 1px var(--focsd-ink);
      }
      [part~='option']:focus-visible {
        outline: 2px solid transparent;
        box-shadow: var(--focsd-focus-ring);
      }
      [part~='swatch'] {
        grid-column: 1 / -1;
        display: flex;
        block-size: 1.5rem;
        border: var(--focsd-border-width) solid var(--focsd-edge);
        border-radius: var(--focsd-radius-control);
        overflow: hidden;
      }
      .chip {
        flex: 1;
        background: var(--_chip, var(--focsd-surface));
        forced-color-adjust: none;
      }
      [part~='name'] {
        font-size: var(--focsd-text-small-size);
        line-height: var(--focsd-text-small-line-height);
      }
      [part~='option-checked'] [part~='name'] {
        font-weight: var(--focsd-text-label-weight);
      }
      [part~='check'] {
        display: inline-flex;
        font-size: 1rem;
      }
      @media (forced-colors: active) {
        [part~='option-checked'] {
          border: 3px solid Highlight;
        }
        [part~='swatch'] {
          border-color: CanvasText;
        }
        [part~='option']:focus-visible {
          outline: 3px solid Highlight;
          outline-offset: 2px;
        }
      }
    `,
  ];
}

defineElement('focsd-theme-picker', FocsdThemePicker);
