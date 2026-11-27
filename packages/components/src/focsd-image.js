import { css } from 'lit';
import { FocsdImageBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';

/**
 * @cssprop --focsd-image-fit - The `object-fit` of the image (default `cover`); `fit="contain"` overrides it.
 */
export class FocsdImage extends FocsdImageBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdImageBase.styles,
    hostStyles,
    css`
    :host { display: block; }
    [part~='frame'] {
      position: relative;
      overflow: hidden;
      border-radius: var(--focsd-radius-surface);
      background: var(--focsd-surface-sunk);
    }
    [part~='image'] { display: block; inline-size: 100%; block-size: 100%; object-fit: var(--focsd-image-fit, cover); }
    :host([fit='contain']) [part~='image'] { object-fit: contain; }
    [part~='fallback'] {
      display: grid;
      place-items: center;
      inline-size: 100%;
      block-size: 100%;
      min-block-size: 3rem;
      color: var(--focsd-ink-muted);
      font-size: 1.5rem;
    }
  `,
  ];
}

defineElement('focsd-image', FocsdImage);
