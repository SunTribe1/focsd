import { css } from 'lit';
import { FocsdDockItemBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles, visuallyHidden } from '@focsd/primitives/styles/shared.js';
import { cycleHueStyles } from '@focsd/primitives/styles/hue.js';
import { enterMotion, hoverTransition } from '@focsd/primitives/styles/motion.js';

export class FocsdDockItem extends FocsdDockItemBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdDockItemBase.styles,
    hostStyles,
    cycleHueStyles,
    css`
      :host {
        box-sizing: border-box;
        position: relative;
        display: inline-flex;
        flex: none;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        /* As tall as the density's controls (32, 36 or 44 px), so the bar lines up with buttons and
           fields beside it; never under the 24 px target (WCAG 2.5.8). */
        min-block-size: max(var(--focsd-target-min), var(--focsd-control-height));
        min-inline-size: max(var(--focsd-target-min), var(--focsd-control-height));
        anchor-name: --_dock-item;
        padding: var(--focsd-space-1) var(--focsd-space-2);
        border-radius: var(--focsd-radius-control);
        color: var(--focsd-ink-muted);
        font-size: var(--_dock-label, 0.75rem);
        font-weight: var(--focsd-text-label-weight);
        line-height: 1;
        white-space: nowrap;
        cursor: pointer;
        user-select: none;
        ${hoverTransition()}
      }
      :host(:hover:not([aria-checked='true']):not([disabled])) {
        background: var(--focsd-surface);
        color: var(--focsd-ink);
      }
      /* Selected: a filled surface, full-strength ink and a bar under the icon, so color is never the only cue. */
      :host([aria-checked='true']) {
        background: var(--focsd-surface-raised, var(--focsd-surface));
        color: var(--focsd-ink);
        box-shadow: inset 0 0 0 var(--focsd-border-width) var(--focsd-edge-quiet);
      }
      :host([aria-checked='true'])::after {
        content: '';
        position: absolute;
        inset-inline: 30%;
        inset-block-end: 0;
        block-size: 2px;
        border-radius: 2px 2px 0 0;
        background: var(--focsd-action);
      }
      :host([disabled]) {
        color: var(--focsd-ink-muted);
        opacity: 0.55;
        cursor: not-allowed;
      }
      [part~='icon'] {
        display: inline-grid;
        place-items: center;
        flex: none;
        font-size: var(--_dock-icon, 1.125rem);
        transition: scale var(--focsd-duration-quick) var(--focsd-ease-move);
        /* Icons cycle through the hues in a colorful preset (Prismatic). */
        color: var(--_hue, currentColor);
      }
      /* The icon grows a little under the pointer, as feedback for which item it is on. */
      :host(:hover:not([disabled])) [part~='icon'] {
        scale: 1.15;
      }
      @media (prefers-reduced-motion: reduce) {
        [part~='icon'] {
          transition: none;
        }
      }
      [part~='icon']:empty {
        display: none;
      }
      ::slotted([slot='icon']) {
        inline-size: 1em;
        block-size: 1em;
      }
      :host([data-labels-hidden]) [part~='label'] {
        ${visuallyHidden}
      }
      :host([data-labels-hidden]) {
        padding: 0;
      }
      /* The label as a tip under the item, on hover and keyboard focus, while labels are hidden. */
      [part~='tip'] {
        position-anchor: --_dock-item;
        position-area: block-end;
        position-try-fallbacks: flip-block;
        inset: auto;
        margin: var(--focsd-space-1) 0 0;
        padding: var(--focsd-space-1) var(--focsd-space-2);
        border: var(--focsd-border-width) solid var(--focsd-ink);
        border-radius: var(--focsd-radius-control);
        background: var(--focsd-ink);
        color: var(--focsd-ground);
        font-family: var(--focsd-font-sans);
        font-size: var(--focsd-text-small-size);
        font-weight: var(--focsd-text-label-weight);
        line-height: 1.2;
        white-space: nowrap;
        pointer-events: none;
      }
      @media (forced-colors: active) {
        :host([aria-checked='true']) {
          forced-color-adjust: none;
          background: SelectedItem;
          color: SelectedItemText;
        }
        :host([aria-checked='true'])::after {
          background: SelectedItemText;
        }
        :host([disabled]) {
          color: GrayText;
        }
      }
    `,
    enterMotion("[part~='tip']:popover-open", { from: 'none', duration: 'quick' }),
  ];
}

defineElement('focsd-dock-item', FocsdDockItem);
