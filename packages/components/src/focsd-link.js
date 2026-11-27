import { css } from 'lit';
import { FocsdLinkBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { linkStyles } from '@focsd-dev/primitives/styles/link.js';

/**
 * @cssprop --focsd-link-color - Text color of the link (default `--focsd-route`).
 */
export class FocsdLink extends FocsdLinkBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdLinkBase.styles, hostStyles, linkStyles, css`:host { display: inline; color: inherit; }`];
}

defineElement('focsd-link', FocsdLink);
