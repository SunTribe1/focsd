import { css } from 'lit';

export const adornedStyles = css`
  [part~='wrap'],
  [part~='spin'] {
    position: relative;
    display: flex;
    align-items: stretch;
  }
  [part~='clear'],
  [part~='reveal'],
  [part~='stepper'] {
    display: inline-grid;
    place-items: center;
    min-inline-size: var(--focsd-control-height);
    padding: 0;
    border: var(--focsd-border-width) solid var(--focsd-edge);
    background: var(--focsd-surface);
    color: var(--focsd-ink);
    font: inherit;
    font-size: 1.1rem;
    cursor: pointer;
  }
  [part~='clear'],
  [part~='reveal'] {
    position: absolute;
    inset-block: var(--focsd-border-width);
    inset-inline-end: var(--focsd-border-width);
    min-inline-size: calc(var(--focsd-control-height) - 2 * var(--focsd-border-width));
    border: 0;
    border-radius: var(--focsd-radius-control);
    background: transparent;
  }
  [part~='clear']:hover,
  [part~='reveal']:hover,
  [part~='stepper']:hover {
    background: var(--focsd-surface-sunk);
  }
  [part~='wrap'] [part~='control'] {
    padding-inline-end: var(--focsd-control-height);
  }
  [part~='icon'] {
    position: absolute;
    inset-block: 0;
    inset-inline-start: var(--focsd-space-3);
    display: grid;
    place-items: center;
    color: var(--focsd-ink-muted);
    pointer-events: none;
  }
  :host([type='search']) [part~='wrap'] [part~='control'] {
    padding-inline-start: calc(var(--focsd-space-3) + 1.5em);
  }
  [part~='control']::-webkit-search-cancel-button {
    display: none;
  }
  [part~='spin'] [part~='control'] {
    border-radius: 0;
    text-align: center;
    border-inline: 0;
  }
  [part~='decrement'] {
    border-start-start-radius: var(--focsd-radius-control);
    border-end-start-radius: var(--focsd-radius-control);
  }
  [part~='increment'] {
    border-start-end-radius: var(--focsd-radius-control);
    border-end-end-radius: var(--focsd-radius-control);
  }
`;
