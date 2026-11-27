import { css } from 'lit';
import { hatch } from './shared.js';

/** Declarations: the invalid border (DESIGN.md: 1px critical, the weight of the focus ring). The
 * message and its icon carry the error too, so it never relies on color alone. */
export const errorBorder = css`
  border-color: var(--focsd-critical);
`;

/** Label and control styles shared by text-like form fields (hint and messages: field-layout.js). */
export const fieldStyles = css`
  :host {
    display: grid;
    gap: var(--focsd-space-1);
  }
  [part~='label'] {
    font-size: var(--focsd-text-small-size);
    font-weight: var(--focsd-text-label-weight);
    line-height: var(--focsd-text-small-line-height);
  }
  [part~='control'] {
    box-sizing: border-box;
    inline-size: 100%;
    min-block-size: var(--focsd-control-height);
    padding-inline: var(--focsd-space-3);
    font: inherit;
    font-size: var(--focsd-text-body-size);
    color: var(--focsd-ink);
    background: var(--focsd-field-background, var(--focsd-surface));
    border: var(--focsd-border-width) solid var(--focsd-field-border-color, var(--focsd-edge));
    border-radius: var(--focsd-field-radius, var(--focsd-radius-control));
  }
  [part~='control']::placeholder {
    color: var(--focsd-ink-muted);
    opacity: 1;
  }
  /* Fallback for engines without plain-name custom states (it would also match a blank attribute). */
  @supports not selector(:state(error)) {
    :host([error]:not([error=''])) [part~='control'] {
      ${errorBorder}
    }
  }
  :host(:state(error)) [part~='control'] {
    ${errorBorder}
  }
  :host([disabled]) [part~='control'],
  :host(:disabled) [part~='control'] {
    color: var(--focsd-ink-muted);
    background: ${hatch};
    cursor: not-allowed;
  }
`;
