import { css } from 'lit';
import { FocsdNavItemBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { floatingSurface } from '@focsd-dev/primitives/styles/surface.js';
import { enterMotion } from '@focsd-dev/primitives/styles/motion.js';
import { cycleHueStyles } from '@focsd-dev/primitives/styles/hue.js';

export class FocsdNavItem extends FocsdNavItemBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdNavItemBase.styles,
    cycleHueStyles,
    hostStyles,
    css`
    :host { position: relative; display: block; }
    [part~='link'], [part~='trigger'] {
      display: inline-flex; align-items: center; gap: var(--focsd-space-1);
      min-block-size: var(--focsd-control-height); padding-inline: var(--focsd-space-3);
      border: 0; border-radius: var(--focsd-radius-control); background: transparent;
      color: var(--focsd-ink); font: inherit; font-size: var(--focsd-text-small-size); font-weight: var(--focsd-text-label-weight);
      text-decoration: none; cursor: pointer;
    }
    [part~='link']:hover, [part~='trigger']:hover { background: var(--focsd-surface-sunk); }
    [part~='link'][aria-current='page'] { box-shadow: inset 0 calc(-1 * var(--focsd-selection-bar-width)) 0 var(--focsd-action); }
    [part~='panel'] {
      ${floatingSurface}
      position: absolute;
      inset-block-start: 100%;
      inset-inline-start: 0;
      z-index: var(--focsd-layer-popover);
      display: grid;
      min-inline-size: 12rem;
      padding: var(--focsd-space-1);
      margin-block-start: var(--focsd-space-1);
    }
    [part~='panel'][hidden] { display: none; }
    /* Inside a vertical nav menu (compact header), groups open in place instead of floating. */
    :host([vertical]) [part~='panel'] {
      position: static; margin: 0; padding-inline-start: var(--focsd-space-4); border: 0; box-shadow: none; background: transparent;
    }
    :host([vertical]) [part~='link'][aria-current='page'] { box-shadow: inset var(--_inline-bar) 0 0 var(--focsd-action); }
    :host([vertical]) [part~='link'],
    :host([vertical]) [part~='trigger'] { inline-size: 100%; justify-content: flex-start; }
    [part~='link'], [part~='trigger'] { transition: background-color var(--focsd-duration-quick) var(--focsd-ease-move); }
    ::slotted(a) {
      display: flex;
      align-items: center;
      min-block-size: var(--focsd-control-height);
      padding-inline: var(--focsd-space-3);
      border-radius: var(--focsd-radius-control);
      color: var(--focsd-route);
    }
  `,
    enterMotion("[part~='panel']:not([hidden])"),
  ];
}

defineElement('focsd-nav-item', FocsdNavItem);
