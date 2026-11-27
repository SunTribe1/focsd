import { css } from 'lit';
import { FocsdContextMenuBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { enterMotion } from '@focsd-dev/primitives/styles/motion.js';
import { menuStyles } from '@focsd-dev/primitives/styles/menu.js';
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
