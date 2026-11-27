import { css } from 'lit';
import { FocsdAppShellBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles, visuallyHidden } from '@focsd/primitives/styles/shared.js';
import { enterMotion } from '@focsd/primitives/styles/motion.js';

/**
 * App shell: lays out the author's header, sidebar, main content and footer in a grid, with a skip
 * link to the main region; below `collapse-below` the sidebar becomes a drawer.
 *
 * @cssprop --focsd-app-shell-drawer-width - Inline size of the navigation drawer (default `min(20rem, 85%)`).
 */
export class FocsdAppShell extends FocsdAppShellBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdAppShellBase.styles,
    hostStyles,
    css`
      :host {
        display: block;
        block-size: 100vh;
        block-size: 100dvh;
        --_drawer-from: translateX(-8%);
      }
      :host(:dir(rtl)) {
        --_drawer-from: translateX(8%);
      }
      [part~='grid'] {
        display: grid;
        grid-template:
          'header header' auto
          'sidebar main' 1fr
          'footer footer' auto / auto 1fr;
        block-size: 100%;
      }
      :host([compact]) [part~='grid'] {
        grid-template:
          'header' auto
          'main' 1fr
          'footer' auto / 1fr;
      }
      [part~='header'] {
        grid-area: header;
        display: flex;
        align-items: center;
        background: var(--focsd-surface);
      }
      [part~='header'] ::slotted(*) {
        flex: 1;
        min-inline-size: 0;
      }
      [part~='sidebar'] {
        grid-area: sidebar;
        overflow: auto;
      }
      /* The sidebar fills its whole row, so its background runs to the footer, not to its last link. */
      [part~='sidebar'] ::slotted(*) {
        min-block-size: 100%;
        box-sizing: border-box;
      }
      [part~='main'] {
        grid-area: main;
        min-block-size: 0;
        padding: var(--focsd-space-6) var(--focsd-space-5);
        overflow: auto;
        overscroll-behavior: contain;
      }
      [part~='main']:focus-visible {
        outline: none;
        box-shadow: var(--focsd-focus-ring-inset);
      }
      @media (forced-colors: active) {
        [part~='main']:focus-visible {
          outline: 2px solid Highlight;
          outline-offset: -2px;
        }
      }
      [part~='footer'] {
        grid-area: footer;
      }
      /* The skip link: visually hidden until focused, then pinned to the top start corner. */
      [part~='skip-link'] {
        position: fixed;
        inset-block-start: var(--focsd-space-3);
        inset-inline-start: var(--focsd-space-3);
        z-index: var(--focsd-layer-skip-link);
        padding: var(--focsd-space-3) var(--focsd-space-4);
        background: var(--focsd-surface-raised);
        border: var(--focsd-border-width) solid var(--focsd-edge);
        border-radius: var(--focsd-radius-control);
        box-shadow: var(--focsd-shadow-overlay);
        color: var(--focsd-link-color, var(--focsd-route));
        font-weight: var(--focsd-text-label-weight);
        text-decoration: underline;
        text-underline-offset: 0.18em;
      }
      [part~='skip-link']:not(:focus) {
        ${visuallyHidden}
        position: fixed !important;
      }
      [part~='nav-toggle'],
      [part~='drawer-close'] {
        display: inline-grid;
        place-items: center;
        flex: none;
        inline-size: var(--focsd-control-height);
        block-size: var(--focsd-control-height);
        min-inline-size: var(--focsd-target-min);
        min-block-size: var(--focsd-target-min);
        margin-inline-start: var(--focsd-space-3);
        padding: 0;
        border: var(--focsd-border-width) solid var(--focsd-edge);
        border-radius: var(--focsd-radius-control);
        background: var(--focsd-surface);
        color: var(--focsd-ink);
        cursor: pointer;
      }
      [part~='nav-toggle']:hover,
      [part~='drawer-close']:hover {
        background: var(--focsd-surface-sunk);
      }
      [part~='drawer-close'] {
        margin: var(--focsd-space-3);
        align-self: flex-end;
      }
      /* The drawer: a modal dialog on the start edge (copied from focsd-drawer's placement="start"). */
      [part~='drawer'] {
        position: fixed;
        inset-block: 0;
        inset-inline: 0 auto;
        box-sizing: border-box;
        inline-size: var(--focsd-app-shell-drawer-width, min(20rem, 85%));
        max-block-size: none;
        block-size: 100%;
        margin: 0;
        padding: 0;
        border: none;
        border-inline-end: var(--focsd-border-width) solid var(--focsd-edge);
        background: var(--focsd-surface-raised);
        color: var(--focsd-ink);
        box-shadow: var(--focsd-shadow-overlay);
        flex-direction: column;
        overflow: auto;
      }
      [part~='drawer'][open] {
        display: flex;
      }
      [part~='drawer']::backdrop {
        background: var(--focsd-scrim);
      }
    `,
    enterMotion("[part~='drawer'][open]", { from: 'var(--_drawer-from)', duration: 'slow' }),
    enterMotion("[part~='drawer'][open]::backdrop", { from: 'none', duration: 'slow' }),
  ];
}

defineElement('focsd-app-shell', FocsdAppShell);
