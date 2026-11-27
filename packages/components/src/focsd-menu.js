import { css } from 'lit';
import { FocsdMenuBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { enterMotion } from '@focsd/primitives/styles/motion.js';
import { anchored, menuStyles } from '@focsd/primitives/styles/menu.js';
import './focsd-menu-item.js';

export class FocsdMenu extends FocsdMenuBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdMenuBase.styles, hostStyles, anchored(css`--_menu-anchor`), menuStyles, enterMotion("[part~='menu']:popover-open")];
}

defineElement('focsd-menu', FocsdMenu);
