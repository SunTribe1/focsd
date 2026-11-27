import { css } from 'lit';
import { FocsdTabsBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import './focsd-tab.js';
import './focsd-tab-panel.js';

export class FocsdTabs extends FocsdTabsBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdTabsBase.styles,
    hostStyles,
    css`
      :host {
        display: block;
      }
      [part~='tablist'] {
        display: flex;
        flex-wrap: wrap;
        gap: var(--focsd-space-1);
        border-block-end: var(--focsd-border-width) solid var(--focsd-edge-quiet);
      }
      [part~='panels'] {
        padding-block-start: var(--focsd-space-4);
      }
    `,
  ];
}

defineElement('focsd-tabs', FocsdTabs);
