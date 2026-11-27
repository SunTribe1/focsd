import { composedContains } from '../internal/popup.js';
import { deepActiveElement } from '../internal/focus.js';
import { FocsdMenuBase } from './menu-base.js';

/** Fallback before a context menu opens when no pointerup follows the press (long-press, keyboard). */
const CONTEXT_MENU_FALLBACK = 400;

/**
 * Context menu: opens on contextmenu over the slotted target, or Shift+F10 / ContextMenu key.
 *
 * @slot target - The element that opens the menu on right-click or Shift+F10.
 */
export class FocsdContextMenuBase extends FocsdMenuBase {
  /** @override */
  static triggerSlot = 'target';

  constructor() {
    super();
    this.addEventListener('contextmenu', this.#onContextMenu);
    // Record focus before the press moves it (mousedown on a non-focusable target blurs to body).
    this.addEventListener(
      'pointerdown',
      (event) => {
        if (event.button === 2 && this.isTriggerEvent(event)) this.#pointerFocus = deepActiveElement();
      },
      { capture: true },
    );
  }

  /** @type {HTMLElement | null} */
  #pointerFocus = null;

  /** @type {HTMLElement | null} */
  #returnFocus = null;

  /**
   * @param {number} x
   * @param {number} y
   */
  #openAt(x, y) {
    this.#returnFocus = this.#pointerFocus ?? deepActiveElement();
    this.#pointerFocus = null;
    const menu = this.menu;
    Object.assign(/** @type {HTMLElement} */ (menu).style, {
      position: 'fixed',
      inset: 'auto',
      left: `${x}px`,
      top: `${y}px`,
      margin: '0',
    });
    this.openMenu('first');
    // Keep the menu inside the viewport: flip above / to the left of the point when needed.
    // Layout size, not getBoundingClientRect: the entry animation scales the menu while it opens.
    const width = /** @type {HTMLElement} */ (menu).offsetWidth;
    const height = /** @type {HTMLElement} */ (menu).offsetHeight;
    const gap = 8;

    if (x + width > innerWidth - gap) /** @type {HTMLElement} */ (menu).style.left = `${Math.max(gap, x - width)}px`;

    if (y + height > innerHeight - gap) /** @type {HTMLElement} */ (menu).style.top = `${Math.max(gap, y - height)}px`;
  }

  /**
   * @internal Shared with the menubar's menus.
   * @param {ToggleEvent} event
   * @override
   */
  onBeforeToggle = (event) => {
    if (event.newState !== 'closed' || !this.items.some((i) => i.matches(':focus'))) return;
    /** @type {HTMLElement} */ (this.trigger)?.focus();

    if (!this.trigger || !composedContains(this.trigger, deepActiveElement())) this.#returnFocus?.focus?.();
    this.#returnFocus = null;
  };

  /** @param {MouseEvent} event */
  #onContextMenu = (event) => {
    if (!this.isTriggerEvent(event)) return;
    event.preventDefault();
    const { clientX, clientY } = event;
    // contextmenu can fire before the button is released; opening now would be light-dismissed by
    // that pointerup. Open after release (or after a short fallback for long-press / keyboard).
    let done = false;

    const open = () => {
      if (done) return;
      done = true;
      clearTimeout(fallback);
      window.removeEventListener('pointerup', onUp, true);
      this.#openAt(clientX, clientY);
    };

    const onUp = () => setTimeout(open, 0);
    const fallback = setTimeout(open, CONTEXT_MENU_FALLBACK);
    window.addEventListener('pointerup', onUp, { capture: true, once: true });
  };

  /** @override @param {KeyboardEvent} event */
  handleTriggerKey(event) {
    if (!((event.key === 'F10' && event.shiftKey) || event.key === 'ContextMenu')) return;
    event.preventDefault();
    const rect = /** @type {HTMLElement} */ (this.trigger).getBoundingClientRect();
    this.#openAt(rect.left, rect.bottom);
  }
}
