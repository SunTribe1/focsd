import { css } from 'lit';
import { FocsdCarouselBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import './focsd-carousel-slide.js';

export class FocsdCarousel extends FocsdCarouselBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdCarouselBase.styles,
    hostStyles,
    css`
    :host { display: block; }
    [part~='carousel'] {
      display: grid;
      gap: var(--focsd-space-3);
      padding: var(--focsd-space-4);
      border: var(--focsd-border-width) solid var(--focsd-edge-quiet);
      border-radius: var(--focsd-radius-surface);
      background: var(--focsd-surface);
    }
    [part~='controls'] { display: flex; gap: var(--focsd-space-2); justify-content: flex-end; }
    [part~='control'] {
      display: inline-grid;
      place-items: center;
      min-inline-size: var(--focsd-control-height);
      min-block-size: var(--focsd-control-height);
      padding-inline: var(--focsd-space-2);
      border: var(--focsd-border-width) solid var(--focsd-edge);
      border-radius: var(--focsd-radius-control);
      background: var(--focsd-surface);
      color: var(--focsd-ink);
      font: inherit;
      font-size: var(--focsd-text-small-size);
      cursor: pointer;
    }
    [part~='control']:hover { background: var(--focsd-surface-sunk); }
  `,
  ];
}

defineElement('focsd-carousel', FocsdCarousel);
