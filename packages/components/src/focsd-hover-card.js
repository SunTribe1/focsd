import { css } from 'lit';
import { FocsdHoverCardBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { floatingSurface } from '@focsd-dev/primitives/styles/surface.js';
import { enterMotion } from '@focsd-dev/primitives/styles/motion.js';

/**
 * @cssprop --focsd-hover-card-width - The widest the card grows (default 20rem, never wider than the viewport less 2rem).
 */
export class FocsdHoverCard extends FocsdHoverCardBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdHoverCardBase.styles,
    hostStyles,
    css`
      :host {
        display: inline;
      }
      ::slotted([slot='trigger']) {
        anchor-name: --_hover-card-anchor;
      }
      [part~='card'] {
        ${floatingSurface}
        position-anchor: --_hover-card-anchor;
        position-area: block-end span-inline-end;
        position-try-fallbacks: flip-block, flip-inline;
        inset: auto;
        margin-block: var(--focsd-space-2);
        inline-size: max-content;
        max-inline-size: min(var(--focsd-hover-card-width, 20rem), 100vw - 2rem);
        padding: var(--focsd-space-4);
        font-size: var(--focsd-text-small-size);
        line-height: var(--focsd-text-small-line-height);
      }
      [part~='card']:popover-open {
        display: grid;
        gap: var(--focsd-space-3);
        justify-items: start;
      }
      :host([placement='top']) [part~='card'] {
        position-area: block-start span-inline-end;
      }
      ::slotted(p) {
        margin: 0;
      }
    `,
    enterMotion("[part~='card']:popover-open"),
  ];
}

defineElement('focsd-hover-card', FocsdHoverCard);
