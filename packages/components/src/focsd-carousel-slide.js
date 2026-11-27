import { css } from 'lit';
import { FocsdCarouselSlideBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { enterMotion } from '@focsd/primitives/styles/motion.js';

export class FocsdCarouselSlide extends FocsdCarouselSlideBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdCarouselSlideBase.styles,
    hostStyles,
    css`
    :host {
      display: block;
      min-block-size: 6rem;
      padding: var(--focsd-space-4);
      border-radius: var(--focsd-radius-control);
      background: var(--focsd-surface-sunk);
    }
    :host([hidden]) { display: none; }
    ::slotted(*) { margin: 0; }
  `,
    enterMotion(':host(:not([hidden]))', { from: 'none' }),
  ];
}

defineElement('focsd-carousel-slide', FocsdCarouselSlide);
