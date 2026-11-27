import { css } from 'lit';

export const disclosureStyles = css`
  :host {
    display: block;
  }
  [part~='heading'] {
    margin: 0;
  }
  [part~='trigger'] {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--focsd-space-3);
    inline-size: 100%;
    min-block-size: var(--focsd-control-height);
    padding-inline: var(--focsd-space-3);
    border: 0;
    border-radius: var(--focsd-radius-control);
    background: transparent;
    color: var(--focsd-ink);
    font: inherit;
    font-weight: var(--focsd-text-label-weight);
    text-align: start;
    cursor: pointer;
  }
  [part~='trigger']:hover {
    background: var(--focsd-surface-sunk);
  }
  [part~='trigger'][aria-disabled='true'] {
    color: var(--focsd-ink-muted);
    cursor: not-allowed;
  }
  [part~='icon'] {
    transition: transform var(--focsd-duration-base) var(--focsd-ease-move);
  }
  [part~='trigger'][aria-expanded='true'] [part~='icon'] {
    transform: rotate(180deg);
  }
  [part~='panel'] {
    padding: var(--focsd-space-2) var(--focsd-space-3) var(--focsd-space-4);
  }
  [part~='panel'] ::slotted(*) {
    margin-block: 0;
  }
`;
