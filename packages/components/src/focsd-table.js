import { css } from 'lit';
import { FocsdTableBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';

const tableCells = css`
  [part~='caption'] { padding-block-end: var(--focsd-space-2); text-align: start; font-weight: var(--focsd-text-label-weight); }
  [part~='header'], [part~='header-cell'] {
    padding: var(--focsd-space-2) var(--focsd-space-3);
    text-align: start;
    font-size: var(--focsd-text-label-size);
    font-weight: var(--focsd-text-label-weight);
    color: var(--focsd-ink-muted); background: var(--focsd-ground); border-block-end: var(--focsd-border-width) solid var(--focsd-edge);
  }
  [part~='cell'] {
    padding: var(--focsd-space-3);
    border-block-end: var(--focsd-border-width) solid var(--focsd-edge-quiet);
    font-size: var(--focsd-text-small-size);
  }
  [part~='numeric'] { text-align: end; font-family: var(--focsd-font-mono); font-variant-numeric: tabular-nums; }
  [part~='sort'] {
    display: inline-flex; align-items: center; gap: var(--focsd-space-1); min-block-size: var(--focsd-target-min);
    padding: 0; border: 0; background: transparent; color: inherit; font: inherit; cursor: pointer;
  }
  [part~='sort']:hover { color: var(--focsd-ink); text-decoration: underline; }
`;

export class FocsdTable extends FocsdTableBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdTableBase.styles,
    hostStyles,
    tableCells,
    css`
    /* Shrink inside grid and flex layouts so wide tables scroll in their region, not the page. */
    :host { display: block; min-inline-size: 0; }
    [part~='viewport'] {
      overflow-x: auto;
      border: var(--focsd-border-width) solid var(--focsd-edge-quiet);
      border-radius: var(--focsd-radius-surface);
      background: var(--focsd-surface);
    }
    [part~='table'] { inline-size: 100%; border-collapse: collapse; }
    [part~='caption'] { padding: var(--focsd-space-3) var(--focsd-space-3) var(--focsd-space-2); }
    tbody tr:nth-child(even) [part~='cell'] { background: color-mix(in oklab, var(--focsd-ground) 55%, var(--focsd-surface)); }
    tbody tr:last-child [part~='cell'] { border-block-end: 0; }
  `,
  ];
}

defineElement('focsd-table', FocsdTable);
