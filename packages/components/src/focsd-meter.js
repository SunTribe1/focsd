import { css } from 'lit';
import { FocsdMeterBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { trackStyles } from '@focsd/primitives/styles/indicator.js';

export class FocsdMeter extends FocsdMeterBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdMeterBase.styles,
    hostStyles,
    trackStyles,
    css`
      :host([level='optimum']) { --_indicator-color: var(--focsd-positive); }
      :host([level='suboptimal']) { --_indicator-color: var(--focsd-caution); }
      :host([level='poor']) { --_indicator-color: var(--focsd-critical); }
      [part~='value-text'] {
        color: var(--focsd-ink-muted);
        font-size: var(--focsd-text-label-size);
      }
    `,
  ];
}

defineElement('focsd-meter', FocsdMeter);
