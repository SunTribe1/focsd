import { css } from 'lit';
import { FocsdSkeletonBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { loopStyles } from '@focsd-dev/primitives/styles/indicator.js';

export class FocsdSkeleton extends FocsdSkeletonBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdSkeletonBase.styles,
    loopStyles,
    css`
      :host {
        display: grid;
        gap: var(--focsd-space-2);
      }
      [part~='skeleton'] {
        display: block;
        block-size: 0.9em;
        border-radius: var(--focsd-radius-tag);
        background: var(--focsd-surface-sunk);
        animation: focsd-skeleton var(--_skeleton-loop) var(--focsd-ease-move) infinite;
      }
      [part~='skeleton']:last-child:not(:first-child) {
        inline-size: 60%;
      }
      :host([shape='rect']) [part~='skeleton'] {
        block-size: 6rem;
        border-radius: var(--focsd-radius-surface);
      }
      :host([shape='circle']) [part~='skeleton'] {
        inline-size: 2.5rem;
        block-size: 2.5rem;
        border-radius: 50%;
      }
      @keyframes focsd-skeleton {
        50% { opacity: 0.55; }
      }
      @media (prefers-reduced-motion: reduce) {
        [part~='skeleton'] { animation: none; }
      }
    `,
  ];
}

defineElement('focsd-skeleton', FocsdSkeleton);
