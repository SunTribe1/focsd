import { css } from 'lit';
import { FocsdStepperBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import './focsd-step.js';

export class FocsdStepper extends FocsdStepperBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdStepperBase.styles,
    hostStyles,
    css`
    :host { display: block; }
    [part~='steps'] { display: flex; flex-wrap: wrap; gap: var(--focsd-space-2); counter-reset: focsd-step; }
  `,
  ];
}

defineElement('focsd-stepper', FocsdStepper);
