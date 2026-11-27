import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { VisualViewportController } from '../internal/viewport.js';
import { edgeIndex, nextIndex } from '../internal/roving.js';
import { typeaheadIndex } from '../internal/typeahead.js';
import { TriggerToggle, isFrom, setTriggerState } from '../internal/popup.js';
import { FocsdMenuItemBase } from './menu-item-base.js';

/**
 * `detail` of `focsd-select` on a menu: the chosen item and its value.
 * @typedef {{ value: string, item: FocsdMenuItemBase }} MenuSelectDetail
 */

/**
 * Menu button: a slotted trigger opens a role=menu popover of FocsdMenuItemBase children. Fires `focsd-select`.
 *
 * @fires {CustomEvent<MenuSelectDetail>} focsd-select - Fired when an item is chosen. `detail.value` is its value.
 * @slot - The `focsd-menu-item` elements.
 * @slot trigger - The button that opens the menu.
 * @csspart menu - The menu element.
 */
export class FocsdMenuBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { label: {}, open: { type: Boolean, reflect: true } };

  /** Name of the slot holding the trigger. */
  static triggerSlot = 'trigger';

  #toggle = new TriggerToggle(() => this.menu.matches(':popover-open'));

  constructor() {
    super();
    /** The accessible name of the menu. */
    this.label = '';
    /** Whether the menu is open. */
    this.open = false;
    this.addEventListener('pointerdown', this.#onPointerDown, { capture: true });
    this.addEventListener('click', this.#onClick);
    this.addEventListener('keydown', this.#onKeyDown);
  }

  /**
   * The slotted trigger element.
   * @returns {HTMLElement | null}
   */
  get trigger() {
    return this.querySelector(`:scope > [slot="${/** @type {typeof FocsdMenuBase} */ (this.constructor).triggerSlot}"]`);
  }

  /**
   * The menu items, in order.
   * @returns {FocsdMenuItemBase[]}
   */
  get items() {
    return [...(this.children ?? [])].filter((el) => el instanceof FocsdMenuItemBase);
  }

  /**
   * For subclasses: the menu element in the shadow root.
   * @returns {HTMLElement}
   */
  get menu() {
    return /** @type {HTMLElement} */ (this.renderRoot.querySelector('[part~="menu"]'));
  }

  /** @param {number} i */
  #isDisabled = (i) => this.items[i]?.disabled ?? true;

  /**
   * For subclasses: whether an event came from the menu's trigger.
   * @param {Event} event
   * @returns {boolean}
   */
  isTriggerEvent(event) {
    return isFrom(event, this.trigger);
  }

  /** Open and focus the first or last item. */
  /** @param {'first' | 'last'} [edge] */
  openMenu(edge = 'first') {
    const menu = this.menu;

    if (!menu.matches(':popover-open')) /** @type {HTMLElement} */ (menu).showPopover();
    this.open = true;
    this.items[edgeIndex(edge, this.items.length, this.#isDisabled)]?.focus();
  }

  /** Close the menu. */
  closeMenu() {
    if (this.menu.matches(':popover-open')) /** @type {HTMLElement} */ (this.menu).hidePopover();
  }

  /** @param {PointerEvent} event */
  #onPointerDown = (event) => {
    if (this.isTriggerEvent(event)) this.#toggle.press();
  };

  /** @param {MouseEvent} event */
  #onClick = (event) => {
    if (/** @type {typeof FocsdMenuBase} */ (this.constructor).triggerSlot === 'trigger' && this.isTriggerEvent(event)) {
      if (/** @type {{ isDisabled?: boolean }} */ (this.trigger).isDisabled) return;

      if (this.#toggle.release()) this.closeMenu();
      else this.openMenu('first');

      return;
    }

    const item = event.composedPath().find((n) => n instanceof FocsdMenuItemBase);

    if (item) this.#activate(item);
  };

  /** @param {FocsdMenuItemBase} item */
  #activate(item) {
    if (item.disabled) return;
    /** @type {MenuSelectDetail} */
    const detail = { value: item.value, item };

    this.dispatchEvent(new CustomEvent('focsd-select', { bubbles: true, detail }));
    this.closeMenu();
  }

  /**
   * Keyboard on the trigger (closed menu). Subclasses override for other triggers.
   * @param {KeyboardEvent} event
   */
  handleTriggerKey(event) {
    if (['ArrowDown', 'Enter', ' '].includes(event.key)) this.openMenu('first');
    else if (event.key === 'ArrowUp') this.openMenu('last');
    else return;
    event.preventDefault();
  }

  /** @param {KeyboardEvent} event */
  #onKeyDown = (event) => {
    const items = this.items;
    const target = /** @type {FocsdMenuItemBase} */ (event.composedPath().find((n) => n instanceof FocsdMenuItemBase));
    const current = items.indexOf(target);

    if (current < 0) {
      if (this.isTriggerEvent(event)) this.handleTriggerKey(event);

      return;
    }

    let next = -1;

    switch (event.key) {
      case 'ArrowDown':
        next = nextIndex(current, 1, items.length, this.#isDisabled);
        break;
      case 'ArrowUp':
        next = nextIndex(current, -1, items.length, this.#isDisabled);
        break;
      case 'Home':
        next = edgeIndex('first', items.length, this.#isDisabled);
        break;
      case 'End':
        next = edgeIndex('last', items.length, this.#isDisabled);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.#activate(/** @type {FocsdMenuItemBase} */ (items[current]));

        return;
      case 'Tab':
        this.closeMenu();

        return;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          next = typeaheadIndex(
            items.map((i) => i.label),
            current,
            event.key,
            this.#isDisabled,
          );
        }
    }

    if (next < 0) return;
    event.preventDefault();
    /** @type {FocsdMenuItemBase} */ (items[next]).focus();
  };

  /**
   * @internal Shared with the menubar's menus.
   * @param {ToggleEvent} event
   */
  onBeforeToggle = (event) => {
    if (event.newState === 'closed' && this.items.some((i) => i.matches(':focus'))) /** @type {HTMLElement} */ (this.trigger)?.focus();
  };

  #viewport = new VisualViewportController(this);

  /**
   * @internal Shared with the menubar's menus.
   * @param {ToggleEvent} event
   */
  onToggle = (event) => {
    this.open = event.newState === 'open';
    this.#viewport.set(this.open);
  };

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    // Removal hides the popover without toggle events; reset so a moved menu reads closed and opens again.
    this.open = false;
    this.#viewport.set(false);
  }

  /** @override */
  updated() {
    if (/** @type {typeof FocsdMenuBase} */ (this.constructor).triggerSlot === 'trigger')
      setTriggerState(this.trigger, { expanded: this.open, haspopup: 'menu' });
  }

  /** @override */
  render() {
    return html`<slot name=${/** @type {typeof FocsdMenuBase} */ (this.constructor).triggerSlot} @slotchange=${() => this.requestUpdate()}></slot>
      <div part="menu" role="menu" aria-label=${this.label || nothing} popover="auto" @beforetoggle=${this.onBeforeToggle} @toggle=${this.onToggle}>
        <slot></slot>
      </div>`;
  }
}
