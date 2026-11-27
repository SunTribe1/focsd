import { css } from 'lit';
import { FocsdDockBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import './focsd-dock-item.js';

/**
 * @cssprop --focsd-dock-background - The dock's surface (default the raised surface).
 * @cssprop --focsd-dock-border-color - The dock's edge (default the quiet edge).
 * @cssprop --focsd-dock-shadow - The dock's shadow (default the overlay shadow).
 * @cssprop --focsd-dock-radius - The dock's corners (default the surface radius).
 * @cssprop --focsd-dock-gap - The space between items (default `--focsd-space-1`).
 */
export class FocsdDock extends FocsdDockBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdDockBase.styles,
    hostStyles,
    css`
      /* The dock hugs its items, even as a grid or flex child that would stretch it. */
      :host {
        display: inline-block;
        inline-size: fit-content;
        max-inline-size: 100%;
      }
      :host([size='s']) {
        --_dock-icon: 1rem;
        --_dock-label: 0.6875rem;
      }
      :host([size='l']) {
        --_dock-icon: 1.5rem;
        --_dock-label: var(--focsd-text-small-size);
      }
      /* The dock: an opaque raised surface with a hairline edge and a soft shadow, so its icons
         and labels stay readable over any content behind it. */
      [part~='group'] {
        display: flex;
        gap: var(--focsd-dock-gap, var(--focsd-space-1));
        /* Room for the focus ring of the first and last item inside the scroller. */
        padding: var(--focsd-space-1);
        overflow-x: auto;
        scrollbar-width: none;
        border: var(--focsd-border-width) solid var(--focsd-dock-border-color, var(--focsd-edge-quiet));
        border-radius: var(--focsd-dock-radius, var(--focsd-radius-surface));
        background: var(--focsd-dock-background, var(--focsd-surface-raised));
        box-shadow: var(--focsd-dock-shadow, var(--focsd-shadow-overlay));
      }
      @media (forced-colors: active) {
        [part~='group'] {
          border-color: CanvasText;
        }
      }
      [part~='group']::-webkit-scrollbar {
        display: none;
      }
    `,
  ];
}

defineElement('focsd-dock', FocsdDock);
