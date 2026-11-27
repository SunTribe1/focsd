import { css } from 'lit';
import { FocsdLoadingOverlayBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import './focsd-spinner.js';

/**
 * Loading overlay: covers its content with a translucent surface, a spinner and "Loading" while
 * `active`, and makes the content inert. The cover fades in (no fade under reduced motion).
 */
export class FocsdLoadingOverlay extends FocsdLoadingOverlayBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdLoadingOverlayBase.styles,
    hostStyles,
    css`
      :host {
        display: block;
        position: relative;
      }
      /* While active, the covered area is at least tall enough for the indicator and its text, so
         they never spill out over short content (a single line, an empty panel). */
      :host([active]) [part~='region'] {
        min-block-size: 6rem;
      }
      [part~='overlay'] {
        position: absolute;
        inset: 0;
        display: grid;
        place-content: center;
        justify-items: center;
        gap: var(--focsd-space-2);
        border-radius: inherit;
        background: color-mix(in oklab, var(--focsd-surface) 80%, transparent);
        animation: focsd-overlay-in var(--focsd-duration-base) var(--focsd-ease-enter);
      }
      [part~='overlay']:focus-visible {
        outline: 2px solid transparent;
        box-shadow: var(--focsd-focus-ring-inset);
      }
      [part~='overlay'] {
        padding: var(--focsd-space-3);
        text-align: center;
      }
      [part~='text'] {
        font-weight: var(--focsd-text-label-weight);
      }
      /* A custom indicator (an image, an animation) is kept to a sensible size. */
      ::slotted([slot='indicator']) {
        max-inline-size: 4rem;
        max-block-size: 4rem;
      }
      @keyframes focsd-overlay-in {
        from {
          opacity: 0;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        [part~='overlay'] {
          animation: none;
        }
      }
      @media (forced-colors: active) {
        [part~='overlay'] {
          background: Canvas;
          border: 1px solid CanvasText;
        }
      }
    `,
  ];
}

defineElement('focsd-loading-overlay', FocsdLoadingOverlay);
