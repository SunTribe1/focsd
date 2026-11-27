import { css } from 'lit';
import { FocsdToggletipBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { floatingSurface } from '@focsd-dev/primitives/styles/surface.js';
import { enterMotion } from '@focsd-dev/primitives/styles/motion.js';

/**
 * Toggletip: an info button that opens a short note on click, tap or Enter. The note may hold links.
 *
 * @cssprop --focsd-toggletip-width - The widest the note grows (default 20rem, never wider than the viewport less 2rem).
 */
export class FocsdToggletip extends FocsdToggletipBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdToggletipBase.styles,
    hostStyles,
    css`
      :host {
        display: inline-block;
        vertical-align: middle;
      }
      [part~='button'] {
        anchor-name: --_toggletip-anchor;
        display: inline-grid;
        place-items: center;
        box-sizing: border-box;
        inline-size: 1.5rem;
        block-size: 1.5rem;
        min-inline-size: var(--focsd-target-min, 24px);
        min-block-size: var(--focsd-target-min, 24px);
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: transparent;
        color: var(--focsd-ink-muted);
        font-size: 1rem;
        cursor: pointer;
      }
      [part~='button']:hover,
      [part~='button'][aria-expanded='true'] {
        background: var(--focsd-surface-sunk);
        color: var(--focsd-ink);
      }
      [part~='panel'] {
        ${floatingSurface}
        position-anchor: --_toggletip-anchor;
        position-area: block-start;
        position-try-fallbacks: flip-block, flip-inline;
        inset: auto;
        margin: var(--focsd-space-2);
        inline-size: max-content;
        max-inline-size: min(var(--focsd-toggletip-width, 20rem), 100vw - 2rem);
        padding: var(--focsd-space-3) var(--focsd-space-4);
        font-size: var(--focsd-text-small-size);
        line-height: var(--focsd-text-small-line-height);
        text-wrap: pretty;
      }
      :host([placement='bottom']) [part~='panel'] {
        position-area: block-end;
      }
      /* Physical sides, as focsd-tour's placement: left stays left in right-to-left pages. */
      :host([placement='left']) [part~='panel'] {
        position-area: left;
      }
      :host([placement='right']) [part~='panel'] {
        position-area: right;
      }
      ::slotted(a) {
        color: var(--focsd-route);
        text-decoration: underline;
        text-underline-offset: 0.18em;
      }
      @media (forced-colors: active) {
        [part~='button'] {
          border: 1px solid ButtonText;
        }
        [part~='button'][aria-expanded='true'] {
          outline: 2px solid Highlight;
        }
      }
    `,
    enterMotion("[part~='panel']:popover-open"),
  ];
}

defineElement('focsd-toggletip', FocsdToggletip);
