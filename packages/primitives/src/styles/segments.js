import { css } from 'lit';
import { hatch } from './shared.js';

/** The segmented field shared by focsd-time-field and focsd-date-field: the group, its spinbutton segments and the label. */
export const segmentStyles = css`
  [part~='label'] { justify-self: start; }
  [part~='field'] {
    display: inline-flex; align-items: center; justify-self: start; gap: 0.1em;
    min-block-size: var(--focsd-control-height); padding-inline: var(--focsd-space-2);
    border: var(--focsd-border-width) solid var(--focsd-field-border-color, var(--focsd-edge));
    border-radius: var(--focsd-field-radius, var(--focsd-radius-control)); background: var(--focsd-field-background, var(--focsd-surface));
    font-variant-numeric: tabular-nums;
  }
  [part~='segment'] {
    min-inline-size: 2ch;
    padding: var(--focsd-space-1);
    border-radius: var(--focsd-radius-tag);
    text-align: center;
    caret-color: transparent;
  }
  [part~='segment']:focus { background: var(--focsd-surface-sunk); }
  /* Keyboard focus rings the whole field; the focused segment keeps its tint. */
  [part~='field']:has(:focus-visible) { outline: 2px solid transparent; box-shadow: var(--focsd-focus-ring); }
  [part~='field'] [part~='segment']:focus-visible { box-shadow: none; }
  [part~='segment'][data-empty] { color: var(--focsd-ink-muted); }
  [part~='field'][data-disabled] { color: var(--focsd-ink-muted); background: ${hatch}; }
`;
