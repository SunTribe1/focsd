import { html } from 'lit';
import { FocsdRadioBase } from './radio-base.js';
import { iconSlotStyles, leadingIcon } from '../internal/icon-slot.js';

/**
 * A segment of a segmented control: a radio with an optional icon before its label. The control
 * manages its checked state, tab stop and the `segment` / `segment-selected` parts on it.
 *
 * @slot - The segment's label.
 * @slot icon - Any icon markup (an SVG, an icon component, an icon-font element), instead of `icon`.
 * @csspart icon - The icon (decorative; the label names the segment).
 * @csspart label - The label element.
 */
export class FocsdSegmentBase extends FocsdRadioBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdRadioBase.styles, iconSlotStyles];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { icon: {}, iconLibrary: { attribute: 'icon-library' } };

  constructor() {
    super();
    /** The name of an icon from the default icon library, shown before the label. */
    this.icon = '';
    /** The registered icon library `icon` comes from; empty for the default. For any other icon kit, use `slot="icon"`. */
    this.iconLibrary = '';
  }

  /** @override */
  render() {
    return html`${leadingIcon(this)}<span part="label"
        ><slot></slot
      ></span>`;
  }
}
