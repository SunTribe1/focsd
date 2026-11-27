import { css } from 'lit';
import { FocsdPaginationBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { hoverMotion } from '@focsd-dev/primitives/styles/motion.js';

export class FocsdPagination extends FocsdPaginationBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdPaginationBase.styles,
    hostStyles,
    css`
    :host { display: block; }
    [part~='list'] { display: flex; flex-wrap: wrap; gap: var(--focsd-space-1); margin: 0; padding: 0; list-style: none; }
    :host([orientation='vertical']) [part~='list'] { flex-direction: column; flex-wrap: nowrap; align-items: stretch; }
    [part~='page'], [part~='previous'], [part~='next'] {
      display: inline-grid; place-items: center; box-sizing: border-box;
      min-inline-size: var(--focsd-control-height); min-block-size: var(--focsd-control-height); padding-inline: var(--focsd-space-2);
      border: var(--focsd-border-width) solid var(--focsd-edge); border-radius: var(--focsd-radius-control);
      background: var(--focsd-surface); color: var(--focsd-ink); font: inherit; font-size: var(--focsd-text-small-size);
      text-decoration: none; cursor: pointer;
    }
    [part~='page']:hover, [part~='previous']:hover, [part~='next']:hover { background: var(--focsd-surface-sunk); }
    [aria-current='page'] {
      background: var(--focsd-action);
      border-color: var(--focsd-action);
      color: var(--focsd-on-action);
      font-weight: var(--focsd-text-label-weight);
    }
    [aria-current='page']:hover { background: var(--focsd-action-hover); }
    [disabled], [aria-disabled='true'], [part~='disabled'] { color: var(--focsd-ink-muted); cursor: not-allowed; opacity: 0.6; }
    @media (forced-colors: active) { [aria-current='page'] { border: 3px solid Highlight; } }
    [part~='gap'] {
      display: inline-grid;
      place-items: center;
      min-inline-size: var(--focsd-control-height);
      color: var(--focsd-ink-muted);
    }
  `,
    hoverMotion("[part~='page'], [part~='previous'], [part~='next']"),
  ];
}

defineElement('focsd-pagination', FocsdPagination);
