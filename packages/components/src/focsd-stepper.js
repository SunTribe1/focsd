import { css } from 'lit';
import { FocsdStepperBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
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
