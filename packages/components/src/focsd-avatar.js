import { css } from 'lit';
import { FocsdAvatarBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { hueStyles } from '@focsd/primitives/styles/hue.js';

/**
 * @cssprop --focsd-avatar-size - Width and height (default 2.5rem; 1.75rem for `size="s"`, 3.5rem for `size="l"`). Set it on the element.
 */
export class FocsdAvatar extends FocsdAvatarBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdAvatarBase.styles,
    hostStyles,
    hueStyles,
    css`
      :host {
        --focsd-avatar-size: 2.5rem;
        display: inline-block;
        inline-size: var(--focsd-avatar-size);
        block-size: var(--focsd-avatar-size);
      }
      :host([size='s']) {
        --focsd-avatar-size: 1.75rem;
      }
      :host([size='l']) {
        --focsd-avatar-size: 3.5rem;
      }
      [part~='avatar'] {
        display: grid;
        place-items: center;
        inline-size: 100%;
        block-size: 100%;
        overflow: hidden;
        border: var(--focsd-border-width) solid var(--focsd-edge-quiet);
        border-radius: 50%;
        /* A colorful preset (Prismatic) gives each name its own hue; others keep the neutral look. */
        border-color: var(--_hue, var(--focsd-edge-quiet));
        background: var(--_hue-tint, var(--focsd-surface-sunk));
        color: var(--_hue, var(--focsd-ink));
        font-size: calc(var(--focsd-avatar-size) * 0.38);
        font-weight: var(--focsd-text-label-weight);
      }
      [part~='image'] {
        inline-size: 100%;
        block-size: 100%;
        object-fit: cover;
      }
    `,
  ];
}

defineElement('focsd-avatar', FocsdAvatar);
