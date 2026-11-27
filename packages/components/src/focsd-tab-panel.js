import { css } from 'lit';
import { FocsdTabPanelBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { enterMotion } from '@focsd-dev/primitives/styles/motion.js';

export class FocsdTabPanel extends FocsdTabPanelBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdTabPanelBase.styles,
    hostStyles,
    css`
      :host {
        display: block;
        border-radius: var(--focsd-radius-control);
      }
    `,
    enterMotion(':host(:not([hidden]))', { from: 'translateY(4px)' }),
  ];
}

defineElement('focsd-tab-panel', FocsdTabPanel);
