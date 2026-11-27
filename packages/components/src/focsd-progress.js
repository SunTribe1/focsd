import { css } from 'lit';
import { FocsdProgressBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { trackStyles, loopStyles } from '@focsd-dev/primitives/styles/indicator.js';

/**
 * Progress: a bar, or a ring with `variant="ring"`.
 *
 * @cssprop --focsd-progress-color - Color of the bar (default `--focsd-action`).
 * @cssprop --focsd-progress-ring-size - Width and height of the ring variant (default 3rem).
 */
export class FocsdProgress extends FocsdProgressBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdProgressBase.styles,
    hostStyles,
    trackStyles,
    loopStyles,
    css`
      /* --_dir flips the slide so it always runs toward the inline end. */
      :host { --_dir: 1; }
      :host(:dir(rtl)) { --_dir: -1; }
      :host([indeterminate]) [part~='indicator'] {
        inline-size: 40%;
        animation: focsd-progress-slide var(--_progress-loop) var(--focsd-ease-move) infinite;
      }
      @keyframes focsd-progress-slide {
        from { transform: translateX(calc(-100% * var(--_dir))); }
        to { transform: translateX(calc(250% * var(--_dir))); }
      }
      @media (prefers-reduced-motion: reduce) {
        :host([indeterminate]) [part~='indicator'] {
          animation: none;
          inline-size: 100%;
          opacity: 0.5;
        }
      }
      /* Ring: the arc starts at the top and runs clockwise (counter-clockwise right to left). */
      [part~='ring'] {
        --_size: var(--focsd-progress-ring-size, 3rem);
        display: grid;
        place-items: center;
        inline-size: var(--_size);
        block-size: var(--_size);
      }
      [part~='ring'] > * { grid-area: 1 / 1; }
      svg { inline-size: 100%; block-size: 100%; overflow: visible; transform: rotate(-90deg); }
      :host(:dir(rtl)) svg { transform: scaleX(-1) rotate(-90deg); }
      circle { fill: none; stroke-width: 4; }
      /* As the bar's track: a sunk band outlined by the edge color, so the ring's extent shows (3:1) and
         the arc meets 3:1 against the band in every theme (the edge color itself is too close to it). */
      [part~='ring-track'] { stroke: var(--focsd-surface-sunk); }
      .edge {
        stroke: var(--focsd-edge);
        stroke-width: var(--focsd-border-width);
        vector-effect: non-scaling-stroke;
      }
      [part~='ring-indicator'] { stroke: var(--focsd-route); }
      [part~='value'] {
        font-size: calc(var(--_size) * 0.25);
        font-variant-numeric: tabular-nums;
        color: var(--focsd-ink);
      }
      :host([indeterminate]) [part~='ring'] { animation: focsd-progress-spin var(--_spin-loop) linear infinite; }
      @keyframes focsd-progress-spin { to { transform: rotate(1turn); } }
      @media (prefers-reduced-motion: reduce) {
        :host([indeterminate]) [part~='ring'] { animation-play-state: paused; }
      }
      @media (forced-colors: active) {
        [part~='ring-track'] { stroke: Canvas; }
        .edge { stroke: CanvasText; }
        [part~='ring-indicator'] { stroke: Highlight; }
      }
    `,
  ];
}

defineElement('focsd-progress', FocsdProgress);
