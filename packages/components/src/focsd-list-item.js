import { css } from 'lit';
import { FocsdListItemBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hatch, hostStyles } from '@focsd/primitives/styles/shared.js';
import { hoverMotion } from '@focsd/primitives/styles/motion.js';

/** A row of `focsd-list`: plain, selectable, or with a reorder handle in a sortable list. */
export class FocsdListItem extends FocsdListItemBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdListItemBase.styles,
    hostStyles,
    css`
    :host {
      display: flex;
      align-items: center;
      min-block-size: var(--focsd-control-height);
      padding-inline: var(--focsd-space-4);
      border-block-end: var(--focsd-border-width) solid var(--focsd-edge-quiet);
    }
    :host(:last-child) { border-block-end: 0; }
    :host([role='option']) { cursor: pointer; }
    :host([role='option']:hover) { background: var(--focsd-surface-sunk); }
    :host([aria-selected='true']) {
      font-weight: var(--focsd-text-label-weight);
      box-shadow: inset var(--_inline-bar) 0 0 var(--focsd-action);
    }
    :host([disabled]) { color: var(--focsd-ink-muted); background: ${hatch}; cursor: not-allowed; }
    @media (forced-colors: active) { :host([aria-selected='true']) { outline: 2px solid Highlight; outline-offset: -2px; } }
    :host([sortable]) { gap: var(--focsd-space-2); padding-inline-start: var(--focsd-space-2); }
    [part~='handle'] {
      display: inline-grid;
      place-items: center;
      flex: none;
      min-inline-size: var(--focsd-target-min);
      min-block-size: var(--focsd-target-min);
      padding: 0; border: 0; border-radius: var(--focsd-radius-control); background: transparent; color: var(--focsd-ink-muted);
      cursor: grab; touch-action: none; user-select: none;
    }
    [part~='handle']:hover { color: var(--focsd-ink); }
    :host([data-dragging]) { background: var(--focsd-surface); box-shadow: var(--focsd-shadow-overlay); }
    :host([data-dragging]) [part~='handle'] { cursor: grabbing; }
  `,
    hoverMotion(':host'),
  ];
}

defineElement('focsd-list-item', FocsdListItem);
