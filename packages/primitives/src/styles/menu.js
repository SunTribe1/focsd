import { css } from 'lit';
import { floatingSurface, popupBlockSize } from './surface.js';

/** @param {import('lit').CSSResult} name */
export const anchored = (name) => css`
  ::slotted([slot='trigger']),
  ::slotted([slot='target']) {
    anchor-name: ${name};
  }
`;

export const menuStyles = css`
  :host {
    display: inline-block;
  }
  [part~='menu'] {
    ${floatingSurface}
    position-anchor: --_menu-anchor;
    position-area: block-end span-inline-end;
    position-try-fallbacks: flip-block, flip-inline;
    inset: auto;
    margin-block: var(--focsd-space-1);
    min-inline-size: 12rem;
    padding: var(--focsd-space-1);
    ${popupBlockSize(css`24rem`)}
  }
`;
