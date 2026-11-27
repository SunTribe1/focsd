import { css } from 'lit';
import { FocsdAnimatedNumberBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';

/**
 * Animated number: counts its text to each new value, in the surrounding font and color with
 * tabular figures, so the width holds while it counts. Shows the final value at once under reduced
 * motion; screen readers only get the final value.
 */
export class FocsdAnimatedNumber extends FocsdAnimatedNumberBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdAnimatedNumberBase.styles,
    css`
      :host {
        display: inline;
        font-variant-numeric: tabular-nums;
      }
      :host([hidden]) {
        display: none;
      }
    `,
  ];
}

defineElement('focsd-animated-number', FocsdAnimatedNumber);
