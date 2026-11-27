import { css } from 'lit';
import { FocsdBadgeBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { toneStyles } from '@focsd/primitives/styles/tone.js';
import { hueStyles } from '@focsd/primitives/styles/hue.js';

export class FocsdBadge extends FocsdBadgeBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdBadgeBase.styles,
    hostStyles,
    toneStyles,
    hueStyles,
    css`
      :host {
        position: relative;
        display: inline-block;
      }
      [part~='badge'] {
        display: inline-flex;
        align-items: center;
        min-block-size: 1.5rem;
        padding-inline: var(--focsd-space-2);
        border: var(--focsd-border-width) solid var(--_tone-edge);
        border-radius: var(--focsd-radius-tag);
        /* \`color\` shows in a colorful preset (Prismatic); elsewhere the tone stays. */
        border-color: var(--_hue, var(--_tone-edge));
        background: var(--_hue-tint, var(--_tone-tint));
        color: var(--_hue, var(--_tone-ink));
        font-size: var(--focsd-text-label-size);
        font-weight: var(--focsd-text-label-weight);
        line-height: 1;
        white-space: nowrap;
      }
      /* Indicator mode: the anchor (an avatar or icon) with a dot or count on one corner. */
      [part~='anchor'] {
        position: relative;
        display: inline-flex;
        vertical-align: middle;
        --_x: 50%;
        --_y: -50%;
        --_dir: 1;
      }
      :host(:dir(rtl)) [part~='anchor'] {
        --_dir: -1;
      }
      :host([placement$='start']) [part~='anchor'] {
        --_x: -50%;
      }
      :host([placement^='bottom']) [part~='anchor'] {
        --_y: 50%;
      }
      [part~='indicator'] {
        position: absolute;
        inset-block-start: 0;
        inset-inline-end: 0;
        box-sizing: border-box;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-inline-size: 1.25rem;
        block-size: 1.25rem;
        padding-inline: var(--focsd-space-1);
        /* No pair holds text on solid critical, so the count is ink on the critical tint (4.5:1) with a critical edge (3:1). */
        border: var(--focsd-border-width) solid var(--focsd-critical);
        border-radius: 999px;
        background: var(--focsd-critical-tint);
        color: var(--focsd-ink);
        font-size: var(--focsd-text-small-size);
        font-weight: var(--focsd-text-label-weight);
        font-variant-numeric: tabular-nums;
        line-height: 1;
        white-space: nowrap;
        translate: calc(var(--_x) * var(--_dir)) var(--_y);
        pointer-events: none;
      }
      :host([placement^='bottom']) [part~='indicator'] {
        inset-block: auto 0;
      }
      :host([placement$='start']) [part~='indicator'] {
        inset-inline: 0 auto;
      }
      /* The dot is drawn as a border, so forced colors keep it visible (backgrounds are replaced there). */
      :host([dot]) [part~='indicator'] {
        min-inline-size: 0;
        inline-size: 0.625rem;
        block-size: 0.625rem;
        padding: 0;
        border-width: 0.3125rem;
        box-shadow: 0 0 0 2px var(--focsd-surface);
      }
    `,
  ];
}

defineElement('focsd-badge', FocsdBadge);
