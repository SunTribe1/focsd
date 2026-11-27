import { css } from 'lit';
import { FocsdMenuBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { enterMotion } from '@focsd-dev/primitives/styles/motion.js';
import { anchored, menuStyles } from '@focsd-dev/primitives/styles/menu.js';
import './focsd-menu-item.js';

export class FocsdMenu extends FocsdMenuBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdMenuBase.styles, hostStyles, anchored(css`--_menu-anchor`), menuStyles, enterMotion("[part~='menu']:popover-open")];
}

defineElement('focsd-menu', FocsdMenu);
