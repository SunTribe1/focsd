import { css } from 'lit';

/**
 * The close (×) button every overlay shares: a quiet square the height of a control, its icon at
 * text size, the hover surface and the focus ring. Each component places it; this sets its look.
 */
export const closeButtonStyles = css`
  [part~='close'] {
    box-sizing: border-box;
    display: inline-grid;
    place-items: center;
    flex: none;
    inline-size: max(var(--focsd-target-min), var(--focsd-control-height));
    block-size: max(var(--focsd-target-min), var(--focsd-control-height));
    padding: 0;
    border: var(--focsd-border-width) solid transparent;
    border-radius: var(--focsd-radius-control);
    background: transparent;
    color: var(--focsd-ink-muted);
    font: inherit;
    cursor: pointer;
  }
  [part~='close']:hover {
    background: var(--focsd-surface-sunk);
    color: var(--focsd-ink);
  }
  [part~='close']:focus-visible {
    outline: 2px solid transparent;
    box-shadow: var(--focsd-focus-ring);
  }
  [part~='close'] svg {
    inline-size: 1.125rem;
    block-size: 1.125rem;
  }
  @media (forced-colors: active) {
    [part~='close'] {
      color: ButtonText;
    }
  }
`;
