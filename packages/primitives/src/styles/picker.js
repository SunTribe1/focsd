import { css } from 'lit';

export const squareButton = css`
  display: inline-grid;
  place-items: center;
  min-inline-size: var(--focsd-control-height);
  min-block-size: var(--focsd-control-height);
  padding: 0;
  border: var(--focsd-border-width) solid var(--focsd-edge);
  border-radius: var(--focsd-radius-control);
  background: var(--focsd-surface);
  color: var(--focsd-ink);
  font: inherit;
  font-size: 1.1rem;
  cursor: pointer;
`;

export const pickerStyles = css`
  [part~='field'] { display: flex; align-items: stretch; gap: var(--focsd-space-1); }
  [part~='field'] [part~='control'] { flex: 1; min-inline-size: 8rem; font-variant-numeric: tabular-nums; }
  [part~='range'] { flex-wrap: wrap; align-items: center; }
  [part~='sublabel'] { font-size: var(--focsd-text-label-size); color: var(--focsd-ink-muted); }
  [part~='group'] { display: grid; gap: var(--focsd-space-1); margin: 0; padding: 0; border: 0; min-inline-size: 0; }
  [part~='group'] [part~='label'] { padding: 0; }
  [part~='trigger'] { ${squareButton} }
  [part~='trigger']:hover { background: var(--focsd-surface-sunk); }
  /* The dialog is only the frame: the panel fills it, so a click on the dialog itself is the backdrop. */
  [part~='dialog'] { inline-size: fit-content; max-inline-size: calc(100% - 2 * var(--focsd-space-4)); padding: 0; }
  [part~='panel'] { display: grid; gap: var(--focsd-space-3); padding: var(--focsd-space-4); }
  [part~='dialog'] [part~='actions'] { margin: 0; gap: var(--focsd-space-2); }
  [part~='cancel'], [part~='done'] {
    ${squareButton}
    min-block-size: max(var(--focsd-target-min), 2.25rem);
    padding-inline: var(--focsd-space-3);
    font-size: var(--focsd-text-label-size);
    font-weight: var(--focsd-text-label-weight);
  }
  [part~='cancel'] { border-color: transparent; background: transparent; }
  [part~='cancel']:hover, [part~='done']:hover { background: var(--focsd-surface-sunk); }
`;
