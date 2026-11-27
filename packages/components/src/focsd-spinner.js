import { css } from 'lit';
import { FocsdSpinnerBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { loopStyles } from '@focsd-dev/primitives/styles/indicator.js';

/**
 * @cssprop --focsd-spinner-size - The spinner's width and height (default `1.5rem`; `size` sets 1rem, 2.5rem or 3.5rem). The ring's thickness follows it.
 * @cssprop --focsd-spinner-color - The moving arc (default `--focsd-action`).
 * @cssprop --focsd-spinner-track - The ring behind it (default `--focsd-edge-quiet`).
 */
export class FocsdSpinner extends FocsdSpinnerBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdSpinnerBase.styles,
    hostStyles,
    loopStyles,
    css`
      :host {
        --_size: var(--focsd-spinner-size, 1.5rem);

        display: inline-block;
        inline-size: var(--_size);
        block-size: var(--_size);
      }
      :host([size='s']) { --_size: var(--focsd-spinner-size, 1rem); }
      :host([size='l']) { --_size: var(--focsd-spinner-size, 2.5rem); }
      :host([size='xl']) { --_size: var(--focsd-spinner-size, 3.5rem); }
      [part~='spinner'] {
        display: block;
        box-sizing: border-box;
        inline-size: 100%;
        block-size: 100%;
        /* The ring scales with the size: 2px at the smallest, about an eighth of the width above that. */
        border: max(2px, calc(var(--_size) / 8)) solid var(--focsd-spinner-track, var(--focsd-edge-quiet));
        border-block-start-color: var(--focsd-spinner-color, var(--focsd-action));
        border-radius: 50%;
        animation: focsd-spin var(--_spin-loop) linear infinite;
      }
      @keyframes focsd-spin {
        to { transform: rotate(1turn); }
      }
      @keyframes focsd-pulse {
        50% { opacity: 0.4; }
      }
      @media (prefers-reduced-motion: reduce) {
        [part~='spinner'] {
          animation: focsd-pulse var(--_pulse-loop) var(--focsd-ease-move) infinite;
        }
      }
    `,
  ];
}

defineElement('focsd-spinner', FocsdSpinner);
