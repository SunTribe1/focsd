import { css } from 'lit';
import { FocsdSplitterPaneBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';

/**
 * Splitter pane: one pane of a `focsd-splitter`, with its size and limits as percentages.
 */
export class FocsdSplitterPane extends FocsdSplitterPaneBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdSplitterPaneBase.styles,
    hostStyles,
    css`
    :host {
      display: block;
      box-sizing: border-box;
      flex: 0 1 var(--_pane-size, auto);
      min-inline-size: 0;
      min-block-size: 0;
      overflow: auto;
      padding: var(--focsd-space-3);
    }
    :host([collapsed]) { display: none; }
  `,
  ];
}

defineElement('focsd-splitter-pane', FocsdSplitterPane);
