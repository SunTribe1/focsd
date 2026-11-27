import { css } from 'lit';
import { FocsdBottomNavBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import './focsd-bottom-nav-item.js';

/**
 * @cssprop --focsd-bottom-nav-height - The bar's height without the safe-area inset (default 4rem). With `position="fixed"` the element keeps this much space (plus the inset) in the page flow.
 * @cssprop --focsd-bottom-nav-background - The bar's background (default the surface).
 */
export class FocsdBottomNav extends FocsdBottomNavBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdBottomNavBase.styles,
    hostStyles,
    css`
      :host {
        --_height: var(--focsd-bottom-nav-height, 4rem);
        --_inset: env(safe-area-inset-bottom, 0px);
        display: block;
      }
      /* Fixed: the bar is fixed to the viewport, and the element keeps its space in the flow. */
      :host([position='fixed']) {
        block-size: calc(var(--_height) + var(--_inset));
      }
      :host([position='sticky']) {
        position: sticky;
        inset-block-end: 0;
        z-index: var(--focsd-layer-sticky);
      }
      /* Hidden on wide screens (hide-above, 768 px by default); the stylesheet covers the first paint.
         The property reflects, so the default shows as hide-above="768"; any other width, and 0, are left to the script. */
      :host([data-wide]) {
        display: none;
      }
      @media (min-width: 768px) {
        :host(:not([hide-above])),
        :host([hide-above='768']) {
          display: none;
        }
      }
      [part~='nav'] {
        box-sizing: border-box;
        min-block-size: calc(var(--_height) + var(--_inset));
        padding-block-end: var(--_inset);
        /* The side insets, the same on both sides so the mapping holds in either direction. */
        padding-inline: max(var(--focsd-space-1), env(safe-area-inset-left, 0px), env(safe-area-inset-right, 0px));
        border-block-start: var(--focsd-border-width) solid var(--focsd-edge-quiet);
        background: var(--focsd-bottom-nav-background, var(--focsd-surface));
      }
      :host([position='fixed']) [part~='nav'] {
        position: fixed;
        inset-inline: 0;
        inset-block-end: 0;
        z-index: var(--focsd-layer-sticky);
      }
      [part~='list'] {
        display: flex;
        align-items: stretch;
        justify-content: space-around;
        gap: var(--focsd-space-1);
        min-block-size: var(--_height);
        margin: 0;
        padding: 0;
        list-style: none;
      }
      @media (forced-colors: active) {
        [part~='nav'] {
          border-block-start-color: CanvasText;
        }
      }
    `,
  ];
}

defineElement('focsd-bottom-nav', FocsdBottomNav);
