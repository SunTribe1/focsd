import { css } from 'lit';
import { FocsdTagBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { toneStyles } from '@focsd/primitives/styles/tone.js';
import { hueStyles } from '@focsd/primitives/styles/hue.js';

export class FocsdTag extends FocsdTagBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdTagBase.styles,
    hostStyles,
    toneStyles,
    hueStyles,
    css`
      :host {
        display: inline-block;
        --_tag-font: var(--focsd-text-small-size);
        --_tag-pad: var(--focsd-space-3);
        --_tag-icon: 1em;
        --_tag-height: max(var(--focsd-target-min), calc(var(--focsd-control-height) - 12px));
      }
      :host([size='s']) {
        --_tag-font: 0.75rem;
        --_tag-pad: var(--focsd-space-2);
        --_tag-height: max(var(--focsd-target-min), calc(var(--focsd-control-height) - 16px));
      }
      :host([size='l']) {
        --_tag-font: var(--focsd-text-body-size);
        --_tag-pad: var(--focsd-space-4);
        --_tag-icon: 1.15em;
        --_tag-height: var(--focsd-control-height);
      }
      [part~='tag'] {
        box-sizing: border-box;
        display: inline-flex;
        align-items: center;
        gap: var(--focsd-space-1);
        /* Smaller than controls, but never below the 24px target size (its remove button). */
        min-block-size: var(--_tag-height);
        padding-inline: var(--_tag-pad);
        border: var(--focsd-border-width) solid var(--focsd-edge);
        border-radius: var(--focsd-radius-tag);
        background: var(--focsd-surface);
        color: var(--_tone-ink);
        font-size: var(--_tag-font);
        line-height: 1.2;
        white-space: nowrap;
      }
      /* A toned tag is filled with its tone's tint and edged in its tone, so the tone reads at a
         glance; the label stays in words and the icon is extra, so color is never the only cue. */
      :host([tone]:not([tone='neutral'])) [part~='tag'] {
        border-color: var(--_tone-edge);
        /* A mix rather than the tint token: it reads as the tone in the dark theme too, where the
           tints sit close to the ground. */
        background: color-mix(in oklab, var(--_tone-edge) 16%, var(--focsd-surface));
        /* Text a fifth of the way toward the ink: darker on light themes, lighter on dark ones, so it
           holds 4.5:1 on the tinted fill in every preset. */
        color: color-mix(in oklab, var(--_tone-ink) 80%, var(--focsd-ink));
      }
      /* \`color\` shows in a colorful preset (Prismatic); elsewhere the tone or neutral look stays. */
      :host([data-hue]) [part~='tag'] {
        border-color: var(--_hue, var(--focsd-edge));
        background: var(--_hue-tint, var(--focsd-surface));
        color: var(--_hue, var(--_tone-ink));
      }
      :host([data-hue][tone]:not([tone='neutral'])) [part~='tag'] {
        border-color: var(--_hue, var(--_tone-edge));
        background: var(--_hue-tint, color-mix(in oklab, var(--_tone-edge) 16%, var(--focsd-surface)));
      }
      :host([shape='pill']) [part~='tag'] {
        border-radius: 999px;
      }
      [part~='icon'] {
        display: inline-grid;
        place-items: center;
        flex: none;
        font-size: var(--_tag-icon);
      }
      [part~='icon'][hidden] {
        display: none;
      }
      ::slotted([slot='icon']) {
        inline-size: 1em;
        block-size: 1em;
      }
      :host([removable]) [part~='tag'] {
        padding-inline-end: var(--focsd-space-1);
      }
      [part~='remove'] {
        display: inline-grid;
        place-items: center;
        min-inline-size: var(--focsd-target-min);
        min-block-size: var(--focsd-target-min);
        padding: 0;
        border: 0;
        border-radius: var(--focsd-radius-tag);
        background: transparent;
        color: currentColor;
        opacity: 0.75;
        font: inherit;
        cursor: pointer;
      }
      :host([shape='pill']) [part~='remove'] {
        border-radius: 50%;
      }
      [part~='remove']:hover {
        background: color-mix(in srgb, currentColor 14%, transparent);
        opacity: 1;
      }
      [part~='remove']:focus-visible {
        outline: 2px solid transparent;
        box-shadow: var(--focsd-focus-ring);
        opacity: 1;
      }
      @media (forced-colors: active) {
        [part~='tag'] {
          border-color: CanvasText;
        }
        [part~='remove'] {
          color: ButtonText;
          opacity: 1;
        }
      }
    `,
  ];
}

defineElement('focsd-tag', FocsdTag);
