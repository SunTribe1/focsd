import { css } from 'lit';
import { FocsdTreeBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import './focsd-tree-item.js';

export class FocsdTree extends FocsdTreeBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdTreeBase.styles,
    hostStyles,
    css`
    /* A minimum width, so a short tree in a centered or flex layout is not as narrow as its longest label. */
    :host { display: block; min-inline-size: min(100%, 16rem); font-size: var(--focsd-text-small-size); }
  `,
  ];
}

defineElement('focsd-tree', FocsdTree);
