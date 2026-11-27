import { css } from 'lit';
import { FocsdContextMenuBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { enterMotion } from '@focsd/primitives/styles/motion.js';
import { menuStyles } from '@focsd/primitives/styles/menu.js';
import './focsd-menu-item.js';

export class FocsdContextMenu extends FocsdContextMenuBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdContextMenuBase.styles,
    hostStyles,
    menuStyles,
    css`:host { display: block; }`,
    enterMotion("[part~='menu']:popover-open", { from: 'scale(0.98)' }),
  ];
}

defineElement('focsd-context-menu', FocsdContextMenu);
