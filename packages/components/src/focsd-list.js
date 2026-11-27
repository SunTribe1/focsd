import { css } from 'lit';
import { FocsdListBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import './focsd-list-item.js';

/** A styled list of `focsd-list-item`s: static, selectable like a listbox, or sortable. */
export class FocsdList extends FocsdListBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdListBase.styles,
    hostStyles,
    css`
    :host { display: block; }
    ::slotted([data-sortable-placeholder]) { box-sizing: border-box; border: var(--focsd-border-width) dashed var(--focsd-edge); }
    [part~='list'] {
      display: grid;
      border: var(--focsd-border-width) solid var(--focsd-edge-quiet);
      border-radius: var(--focsd-radius-surface);
      background: var(--focsd-surface);
    }
  `,
  ];
}

defineElement('focsd-list', FocsdList);
