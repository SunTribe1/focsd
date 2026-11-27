import { css } from 'lit';
import { clearTheme, setTheme } from '@focsd-dev/tokens';
import { FocsdThemeToggleBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles, visuallyHidden } from '@focsd-dev/primitives/styles/shared.js';

/**
 * Theme toggle: Light, Dark, System and High contrast as a segmented
 * radio group. It sets `data-focsd-theme` on `<html>` (or `target`) and stores the choice under
 * `focsd-theme` in `localStorage`; add the tokens' `noFlashScript` to the page head so the stored
 * theme applies before the first paint.
 *
 * @cssprop --focsd-theme-toggle-radius - Corner radius of the group (default `--focsd-radius-control`).
 */
export class FocsdThemeToggle extends FocsdThemeToggleBase {
  /** @override */
  static themeApi = { setTheme, clearTheme };

  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdThemeToggleBase.styles,
    hostStyles,
    css`
      :host {
        display: inline-block;
        font-size: var(--focsd-text-small-size);
        line-height: var(--focsd-text-small-line-height);
      }
      [part~='group'] {
        display: inline-flex;
        flex-wrap: wrap;
        gap: 2px;
        padding: 2px;
        border: var(--focsd-border-width) solid var(--focsd-edge);
        border-radius: var(--focsd-theme-toggle-radius, var(--focsd-radius-control));
        background: var(--focsd-surface);
      }
      [part~='option'] {
        display: inline-flex;
        align-items: center;
        gap: var(--focsd-space-1);
        box-sizing: border-box;
        /* The whole group is one control tall, so it lines up with buttons and fields beside it. */
        min-block-size: max(var(--focsd-target-min), calc(var(--focsd-control-height) - 4px - 2 * var(--focsd-border-width)));
        padding-inline: var(--focsd-space-3);
        border: var(--focsd-border-width) solid transparent;
        border-radius: calc(var(--focsd-theme-toggle-radius, var(--focsd-radius-control)) - 2px);
        color: var(--focsd-ink-muted);
        cursor: pointer;
        user-select: none;
        transition: background-color var(--focsd-duration-quick) var(--focsd-ease-move);
      }
      [part~='option']:hover {
        color: var(--focsd-ink);
        background: var(--focsd-surface-sunk);
      }
      [part~='option-checked'] {
        color: var(--focsd-ink);
        background: var(--focsd-surface-sunk);
        border-color: var(--focsd-ink);
        box-shadow: inset 0 calc(-1 * var(--focsd-selection-bar-width)) 0 var(--focsd-action);
        font-weight: var(--focsd-text-label-weight);
      }
      [part~='option']:focus-visible {
        outline: 2px solid transparent;
        box-shadow: var(--focsd-focus-ring);
      }
      [part~='icon'] {
        display: inline-flex;
        font-size: 1rem;
      }
      /* Icons only: square options, the text kept for assistive technology. */
      :host([label-display='hidden']) [part~='option'] {
        justify-content: center;
        min-inline-size: max(var(--focsd-target-min), calc(var(--focsd-control-height) - 4px - 2 * var(--focsd-border-width)));
        padding-inline: 0;
      }
      :host([label-display='hidden']) [part~='label'] {
        ${visuallyHidden}
      }
      @media (forced-colors: active) {
        [part~='option-checked'] {
          border: 3px solid Highlight;
        }
        [part~='option']:focus-visible {
          outline: 3px solid Highlight;
          outline-offset: 2px;
        }
      }
    `,
  ];
}

defineElement('focsd-theme-toggle', FocsdThemeToggle);
