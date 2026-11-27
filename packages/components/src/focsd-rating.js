import { css } from 'lit';
import { FocsdRatingBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { fieldLayoutStyles } from '@focsd-dev/primitives/styles/field-layout.js';

export class FocsdRating extends FocsdRatingBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdRatingBase.styles,
    hostStyles,
    fieldLayoutStyles,
    css`
      :host {
        display: block;
      }
      [part~='label'] {
        font-size: var(--focsd-text-small-size);
        font-weight: var(--focsd-text-label-weight);
      }
      [part~='stars'] {
        display: inline-flex;
        gap: var(--focsd-space-1);
      }
      [part~='star'] {
        display: inline-grid;
        place-items: center;
        min-inline-size: var(--focsd-control-height);
        min-block-size: var(--focsd-control-height);
        border-radius: var(--focsd-radius-control);
        color: var(--focsd-ink-muted);
        font-size: 1.5rem;
        cursor: pointer;
      }
      :host([readonly]) [part~='star'] {
        min-inline-size: 0;
        min-block-size: 0;
        font-size: 1.1rem;
        cursor: default;
      }
      [part~='filled'] {
        color: var(--focsd-caution);
      }
      [part~='filled'] svg {
        fill: currentColor;
      }
    `,
  ];
}

defineElement('focsd-rating', FocsdRating);
