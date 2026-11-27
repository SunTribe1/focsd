import { css } from 'lit';

export const trackStyles = css`
  :host {
    display: grid;
    gap: var(--focsd-space-1);
  }
  [part~='track'] {
    display: block;
    block-size: 0.5rem;
    overflow: hidden;
    border: var(--focsd-border-width) solid var(--focsd-edge);
    border-radius: var(--focsd-radius-tag);
    background: var(--focsd-surface-sunk);
  }
  [part~='indicator'] {
    display: block;
    block-size: 100%;
    /* A level color (meter) first; then the page's color; then a preset's gradient (Prismatic); then the action. */
    background: var(--_indicator-color, var(--focsd-progress-color, var(--focsd-fill-gradient, var(--focsd-action))));
    transition: transform var(--focsd-duration-base) var(--focsd-ease-move);
  }
`;

/*
 * Loop periods. These are deliberate exceptions to the duration tokens: the tokens time one-shot
 * transitions and drop to 0ms under reduced motion, while a busy loop needs a steady period of its
 * own (reduced motion swaps each loop for a static or slow-pulse state below).
 */
export const loopStyles = css`
  :host {
    --_progress-loop: 1.4s;
    --_spin-loop: 0.8s;
    --_pulse-loop: 2s;
    --_skeleton-loop: 1.6s;
  }
`;
