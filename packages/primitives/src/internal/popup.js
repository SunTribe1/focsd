import { composedContains, deepActiveElement } from './focus.js';

export { composedContains };

/**
 * Set expanded/haspopup on a trigger: forwarded props for Focsd buttons, attributes otherwise.
 * @param {Element | null | undefined} trigger
 * @param {{ expanded: boolean, haspopup: string }} state
 */
export function setTriggerState(trigger, { expanded, haspopup }) {
  if (!trigger) return;

  if ('expanded' in trigger && 'haspopup' in trigger) {
    trigger.expanded = expanded;
    trigger.haspopup = haspopup;
  } else {
    trigger.setAttribute('aria-expanded', String(expanded));
    trigger.setAttribute('aria-haspopup', haspopup);
  }
}

/** Elements that take focus by Tab: links, enabled form controls and positive or zero tabindex. */
export const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * First focusable element among a slot's assigned elements (including delegatesFocus hosts).
 * @param {HTMLSlotElement} slot
 * @returns {Element | null}
 */
export function firstFocusable(slot) {
  for (const el of slot.assignedElements({ flatten: true })) {
    if (el.shadowRoot?.delegatesFocus || el.matches(FOCUSABLE)) return el;
    const inner = el.querySelector(`${FOCUSABLE}, :defined`);

    if (inner && (inner.matches(FOCUSABLE) || inner.shadowRoot?.delegatesFocus)) return inner;
  }

  return null;
}

/**
 * True when focus is anywhere inside `host` in the composed tree.
 * @param {Node} host
 * @returns {boolean}
 */
export const focusWithin = (host) => composedContains(host, deepActiveElement());

/**
 * True when `event` passed through `el` (its composed path includes it, across shadow roots).
 * @param {Event} event
 * @param {EventTarget | null | undefined} el
 * @returns {boolean}
 */
export const isFrom = (event, el) => Boolean(el && event.composedPath().includes(el));

/**
 * Click-to-toggle for a light-dismiss (`popover="auto"`) popup's trigger. Pressing the trigger of
 * an open popup light-dismisses it before the click arrives, so the click alone would reopen it.
 * Call `press()` on the trigger's pointerdown and `release()` on its click: `release()` says
 * whether the popup was open when the press began (or is open now, for a keyboard click), so the
 * click should close it. No timers: touch engines may deliver the click long after pointerup.
 * The recorded press is forgotten on pointercancel, on the next keydown (so keyboard activation
 * never sees a stale press), and when `release()` consumes it; the next `press()` overwrites it.
 */
export class TriggerToggle {
  #isOpen;

  #wasOpen = false;

  /** @type {EventTarget | null} Where the pending pointercancel and keydown listeners are. */
  #target = null;

  /** @param {() => boolean} isOpen Whether the popup is showing right now. */
  constructor(isOpen) {
    this.#isOpen = isOpen;
  }

  /**
   * Record the popup's state at pointerdown on the trigger.
   * @param {EventTarget} [gestureTarget] Where pointercancel and keydown are heard (default: the window).
   */
  press(gestureTarget = globalThis) {
    this.#forget();
    this.#wasOpen = this.#isOpen();
    this.#target = gestureTarget;
    gestureTarget.addEventListener('pointercancel', this.#forget, true);
    gestureTarget.addEventListener('keydown', this.#forget, true);
  }

  /**
   * At the trigger's click: true when the click should close the popup, false when it should open
   * it. Consumes the recorded press.
   * @returns {boolean}
   */
  release() {
    const wasOpen = this.#wasOpen || this.#isOpen();
    this.#forget();

    return wasOpen;
  }

  /** Drop the recorded press and its listeners. */
  #forget = () => {
    this.#wasOpen = false;
    this.#target?.removeEventListener('pointercancel', this.#forget, true);
    this.#target?.removeEventListener('keydown', this.#forget, true);
    this.#target = null;
  };
}

/** @typedef {import('lit').ReactiveControllerHost & HTMLElement} ControllerHost */

/**
 * Calls `onLeave` once focus has left `host` (checked after the focus move settles, so moving
 * between elements inside the host does not count). A pending check is dropped on disconnect and
 * made again on reconnect, so a host moved in the DOM right after focus left still closes.
 */
class FocusLeaveController {
  #host;

  #onLeave;

  #timer = 0;

  /**
   * @param {ControllerHost} host
   * @param {() => void} onLeave
   */
  constructor(host, onLeave) {
    this.#host = host;
    this.#onLeave = onLeave;
    host.addController(this);
    host.addEventListener('focusout', this.#onFocusOut);
  }

  /** A check was pending when the host left the page (it may be moving): check again on reconnect. */
  #recheck = false;

  #onFocusOut = () => {
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      this.#timer = 0;

      if (this.#host.isConnected && !focusWithin(this.#host)) this.#onLeave();
    });
  };

  hostConnected() {
    if (!this.#recheck) return;
    this.#recheck = false;
    this.#onFocusOut();
  }

  hostDisconnected() {
    this.#recheck = this.#timer !== 0;
    clearTimeout(this.#timer);
    this.#timer = 0;
  }
}

/**
 * Call `onLeave` when focus leaves `host` ("focus left, so close"). See {@link FocusLeaveController}.
 * @param {ControllerHost} host
 * @param {() => void} onLeave
 * @returns {FocusLeaveController}
 */
export const onFocusLeave = (host, onLeave) => new FocusLeaveController(host, onLeave);

/**
 * Hover and focus intent for hover-opened popups (tooltip, hover card): show after a delay, and
 * hide after a grace period unless the pointer or focus came back (WCAG 1.4.13 hoverable). The
 * host reports its own pointer and focus events with `setHovered()` and `setFocused()`. A new
 * show or hide replaces the pending one; on disconnect both are dropped and the state resets.
 */
export class HoverIntent {
  #hovered = false;

  #focused = false;

  #show;

  #hide;

  #showTimer = 0;

  #hideTimer = 0;

  /**
   * @param {import('lit').ReactiveControllerHost} host
   * @param {{ show: () => void, hide: () => void }} actions
   */
  constructor(host, { show, hide }) {
    this.#show = show;
    this.#hide = hide;
    host.addController(this);
  }

  /** The pointer is over the host or its popup. */
  get hovered() {
    return this.#hovered;
  }

  /** Focus is inside the host or its popup. */
  get focused() {
    return this.#focused;
  }

  /** The pointer or focus is holding the popup open. */
  get engaged() {
    return this.#hovered || this.#focused;
  }

  /** @param {boolean} hovered Whether the pointer is over the host or its popup. */
  setHovered(hovered) {
    this.#hovered = hovered;
  }

  /** @param {boolean} focused Whether focus is inside the host or its popup. */
  setFocused(focused) {
    this.#focused = focused;
  }

  /** @param {number} delay Milliseconds before showing. */
  showAfter(delay) {
    this.cancel();
    this.#showTimer = setTimeout(this.#show, delay);
  }

  /** @param {number} delay Grace period in milliseconds; the popup stays if engaged by then. */
  hideAfter(delay) {
    this.cancel();
    this.#hideTimer = setTimeout(() => {
      if (!this.engaged) this.#hide();
    }, delay);
  }

  /** Drop a pending hide, keeping a pending show. */
  cancelHide() {
    clearTimeout(this.#hideTimer);
  }

  /** Drop the pending show and hide. */
  cancel() {
    clearTimeout(this.#showTimer);
    clearTimeout(this.#hideTimer);
  }

  hostDisconnected() {
    this.cancel();
    this.#hovered = false;
    this.#focused = false;
  }
}
