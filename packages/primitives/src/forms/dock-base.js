import { html, nothing } from 'lit';
import { FocsdSegmentedControlBase } from './segmented-control-base.js';
import { FocsdDockItemBase } from './dock-item-base.js';

/**
 * Dock: a compact row of icon items in a raised container, one of them selected, for switching
 * between views or categories. Each item's label shows as a tip on hover and keyboard focus, or
 * under its icon with `label-display="shown"`; it always names the item for assistive technology. It behaves as a segmented control (an APG radio group with selection
 * following focus: one tab stop, arrows, Home and End) and is form-associated, but it has no
 * visible label, hint or messages: name it with `label`, which becomes its accessible name.
 *
 * @fires input - Fired on every user edit of the value.
 * @fires change - Fired when the user commits a change to the value or state.
 * @slot - The `focsd-dock-item` elements.
 * @csspart group - The group element (role=radiogroup).
 * @csspart item - Set on every item element.
 * @csspart item-selected - Set on the selected item element.
 * @omit hint, error, warning, success, label-position, error-message, warning-message, warning-pattern
 */
export class FocsdDockBase extends FocsdSegmentedControlBase {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { labelDisplay: { attribute: 'label-display', reflect: true } };

  constructor() {
    super();
    /** @type {'shown' | 'hidden'} Where each item's label shows: as a tip on hover and keyboard focus (`hidden`, default), or under its icon (`shown`). Either way it names the item for assistive technology. */
    this.labelDisplay = 'hidden';
  }

  /** The items, in order. */
  get items() {
    return /** @type {FocsdDockItemBase[]} */ (this.radios.filter((el) => el instanceof FocsdDockItemBase));
  }

  /** @override */
  updated() {
    super.updated();

    for (const item of this.radios) {
      const selected = item.getAttribute('aria-checked') === 'true';

      item.setAttribute('part', selected ? 'item item-selected' : 'item');
      item.toggleAttribute('data-labels-hidden', this.labelDisplay === 'hidden');
    }
  }

  /** @override */
  render() {
    return html`<div
      part="group"
      role="radiogroup"
      aria-label=${this.label || this.localize.term('dock')}
      aria-required=${this.required ? 'true' : nothing}
      aria-disabled=${this.isDisabled ? 'true' : nothing}
    >
      <slot @slotchange=${() => this.requestUpdate()}></slot>
    </div>`;
  }
}
