import { css } from 'lit';
import { FocsdStatusDotBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';

/**
 * Status dot: a small shape per status (filled circle online, ring offline, square busy, triangle
 * warning, cross error, dash neutral) in the status color, named by its label. In forced colors
 * the shape is drawn in `CanvasText`.
 *
 * `pulse` beats twice (about 4 s) and stops, and does not run under reduced motion. The name is
 * "label, status" when a custom label is set.
 *
 * @cssprop --focsd-status-dot-size - The dot's size (default `0.625rem`).
 */
export class FocsdStatusDot extends FocsdStatusDotBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdStatusDotBase.styles,
    hostStyles,
    css`
      :host {
        display: inline-flex;
        vertical-align: middle;
        --_size: var(--focsd-status-dot-size, 0.625rem);
        --_dot: var(--focsd-ink-muted);
      }
      [part~='base'] {
        display: inline-flex;
        align-items: center;
        gap: var(--focsd-space-2);
      }
      .dot {
        position: relative;
        display: inline-flex;
        flex: none;
      }
      [part~='dot'] {
        inline-size: var(--_size);
        block-size: var(--_size);
        fill: var(--_dot);
      }
      [data-status='online'] {
        --_dot: var(--focsd-positive);
      }
      [data-status='busy'],
      [data-status='error'] {
        --_dot: var(--focsd-critical);
      }
      [data-status='warning'] {
        --_dot: var(--focsd-caution);
      }
      [part~='label'] {
        font-size: var(--focsd-text-small-size);
        line-height: var(--focsd-text-small-line-height);
      }
      .halo {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: var(--_dot);
        /* Two 2 s beats, then still: movement over 5 s needs a way to stop it (WCAG 2.2.2). */
        animation: focsd-status-pulse 2s var(--focsd-ease-exit) 2;
        pointer-events: none;
      }
      @keyframes focsd-status-pulse {
        from {
          opacity: 0.5;
          transform: scale(1);
        }
        to {
          opacity: 0;
          transform: scale(2.4);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .halo {
          display: none;
        }
      }
      @media (forced-colors: active) {
        [part~='dot'] {
          fill: CanvasText;
        }
        .halo {
          display: none;
        }
      }
    `,
  ];
}

defineElement('focsd-status-dot', FocsdStatusDot);
