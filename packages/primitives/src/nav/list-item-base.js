import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { iconSvg } from '../internal/icons.js';

/**
 * List item: listitem, or an option when the list is selectable. In a sortable list it renders a
 * reorder handle before its content: a button, or in a selectable list (where an option may not
 * hold a button) a pointer-only grip hidden from assistive technology, as the option itself moves
 * with Alt+ArrowUp and Alt+ArrowDown. A disabled item's handle is disabled.
 *
 * @slot - Default content.
 * @csspart handle - The reorder button (sortable lists only).
 * @csspart status - The live status where a sortable list announces moving this item (visually hidden).
 */
export class FocsdListItemBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    value: {},
    disabled: { type: Boolean, reflect: true },
    sortable: { type: Boolean, reflect: true },
    label: {},
    _option: { state: true },
  };

  constructor() {
    super();
    /** The value the list takes when this item is selected. */
    this.value = '';
    /** Disables the item. */
    this.disabled = false;
    /** Whether the item shows a reorder handle; the parent `focsd-list` sets it from its own `sortable`. */
    this.sortable = false;
    /**
     * Names the item in a sortable list (its reorder button and announcements); without it, the
     * item's text. Set it when the item holds other controls, or when its text changes after it is
     * shown: a text-only edit does not rename the reorder button.
     */
    this.label = '';
    /** @internal Whether the item is an option (its list is selectable): the handle is then pointer-only. Set by the list. */
    this._option = false;
  }

  /** The name a sortable list uses for this item: `label`, else its text. */
  get itemName() {
    return this.label || (this.textContent ?? '').trim();
  }

  /** The reorder button in the shadow root, or null when the item is not sortable. */
  get handle() {
    return /** @type {HTMLButtonElement | null} */ (this.renderRoot?.querySelector?.('[part~="handle"]') ?? null);
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    if (!changed.has('disabled')) return;

    if (this.disabled) this.setAttribute('aria-disabled', 'true');
    else this.removeAttribute('aria-disabled');
  }

  /** @override */
  render() {
    const grip = this._option
      ? html`<span part="handle" aria-hidden="true">${iconSvg('grip')}</span>`
      : html`<button part="handle" type="button" aria-label=${this.localize.term('reorderNamed', this.itemName)} ?disabled=${this.disabled}>
            ${iconSvg('grip')}
          </button>`;

    const handle = this.sortable ? html`${grip}<span part="status" role="status" class="focsd-visually-hidden"></span>` : nothing;

    // The handle is named after the item's text: render again when the content changes.
    return html`${handle}<slot @slotchange=${() => this.requestUpdate()}></slot>`;
  }
}
