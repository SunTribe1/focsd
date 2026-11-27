import { css } from 'lit';

/** Sets --_tone-ink / --_tone-tint / --_tone-edge on :host from its `tone` attribute. */
export const toneStyles = css`
  :host {
    --_tone-ink: var(--focsd-ink);
    --_tone-tint: var(--focsd-surface-sunk);
    --_tone-edge: var(--focsd-edge-quiet);
  }
  :host([tone='positive']) {
    --_tone-ink: var(--focsd-positive);
    --_tone-tint: var(--focsd-positive-tint);
    --_tone-edge: var(--focsd-positive);
  }
  :host([tone='caution']) {
    --_tone-ink: var(--focsd-caution);
    --_tone-tint: var(--focsd-caution-tint);
    --_tone-edge: var(--focsd-caution);
  }
  :host([tone='critical']) {
    --_tone-ink: var(--focsd-critical);
    --_tone-tint: var(--focsd-critical-tint);
    --_tone-edge: var(--focsd-critical);
  }
  :host([tone='info']) {
    --_tone-ink: var(--focsd-info);
    --_tone-tint: var(--focsd-info-tint);
    --_tone-edge: var(--focsd-info);
  }
`;
