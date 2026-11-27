import { css } from 'lit';
import { FocsdSplitButtonBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hatch, hostStyles } from '@focsd/primitives/styles/shared.js';
import { enterMotion, hoverTransition } from '@focsd/primitives/styles/motion.js';
import { menuStyles } from '@focsd/primitives/styles/menu.js';
import './focsd-button.js';
import './focsd-menu-item.js';

/** Split button: a main action button joined to a menu button that opens related actions. */
export class FocsdSplitButton extends FocsdSplitButtonBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdSplitButtonBase.styles,
    hostStyles,
    menuStyles,
    enterMotion("[part~='menu']:popover-open"),
    css`
      [part~='group'] {
        display: inline-flex;
        align-items: stretch;
      }
      [part~='main']::part(control) {
        border-start-end-radius: 0;
        border-end-end-radius: 0;
        border-inline-end-width: 0;
      }
      [part~='menu-button'] {
        anchor-name: --_menu-anchor;
        box-sizing: border-box;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-block-size: var(--focsd-control-height);
        min-inline-size: var(--focsd-control-height);
        padding-inline: var(--focsd-space-2);
        font: inherit;
        border: var(--focsd-border-width) solid var(--focsd-edge);
        border-inline-start: 1px solid var(--focsd-edge);
        border-start-start-radius: 0;
        border-end-start-radius: 0;
        border-start-end-radius: var(--focsd-radius-control);
        border-end-end-radius: var(--focsd-radius-control);
        background: var(--focsd-surface);
        color: var(--focsd-ink);
        cursor: pointer;
        ${hoverTransition({ press: true })}
      }
      [part~='menu-button']:hover {
        background: var(--focsd-surface-sunk);
      }
      [part~='menu-button'] svg {
        inline-size: 1em;
        block-size: 1em;
      }
      :host([variant='action']) [part~='menu-button'] {
        background: var(--focsd-action);
        border-color: var(--focsd-action);
        border-inline-start-color: var(--focsd-edge);
        color: var(--focsd-on-action);
      }
      :host([variant='action']) [part~='menu-button']:hover {
        background: var(--focsd-action-hover);
      }
      :host([variant='quiet']) [part~='menu-button'] {
        background: transparent;
        border-color: transparent;
        border-inline-start-color: var(--focsd-edge);
      }
      :host([variant='critical']) [part~='menu-button'] {
        border-color: var(--focsd-critical);
        border-inline-start-color: var(--focsd-edge);
        color: var(--focsd-critical);
      }
      :host([variant='critical']) [part~='menu-button']:hover {
        background: var(--focsd-critical-tint);
      }
      [part~='menu-button']:disabled,
      :host([variant]) [part~='menu-button']:disabled {
        cursor: not-allowed;
        color: var(--focsd-ink-muted);
        border-color: var(--focsd-edge);
        background: ${hatch};
      }
    `,
  ];
}

defineElement('focsd-split-button', FocsdSplitButton);
