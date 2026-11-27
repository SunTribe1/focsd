/**
 * Publishes the visual viewport height as `--_focsd-visual-viewport-height` on the root element while
 * any popup is open. Phones shrink the visual viewport (not `vh`) when the on-screen keyboard
 * opens, so lists capped with this variable stay above the keyboard.
 */
const VAR = '--_focsd-visual-viewport-height';
/**
 * The parts of a window that tracking uses (a real window, or a stand-in in tests).
 * @typedef {{ visualViewport?: VisualViewport | null, document?: { documentElement?: { style?: CSSStyleDeclaration } } }} TrackedWindow
 */

/**
 * Holders per window, so nested popups share one listener.
 * @type {WeakMap<TrackedWindow, { count: number, update: () => void }>}
 */
const holders = new WeakMap();

/**
 * Start tracking for the lifetime of one open popup. Returns its release function (idempotent).
 * @param {TrackedWindow} [win] the window to track (injectable for tests)
 * @returns {() => void}
 */
export function trackVisualViewport(win = globalThis.window) {
  const viewport = win?.visualViewport;
  const style = win?.document?.documentElement?.style;

  if (!viewport || !style?.setProperty) return () => {};

  let state = holders.get(win);

  if (!state) {
    const update = () => style.setProperty(VAR, `${Math.round(viewport.height)}px`);
    state = { count: 0, update };
    holders.set(win, state);
    viewport.addEventListener('resize', update);
    update();
  }

  state.count += 1;

  let released = false;

  return () => {
    if (released) return;
    released = true;
    state.count -= 1;

    if (state.count > 0) return;
    viewport.removeEventListener('resize', state.update);
    style.removeProperty(VAR);
    holders.delete(win);
  };
}

/** Holds viewport tracking while its host's popup is open; releases on close or disconnect. */
/** @typedef {import('lit').ReactiveController} ReactiveController */

/** @implements {ReactiveController} */
export class VisualViewportController {
  /** @type {(() => void) | null} */
  #release = null;
  /** @type {import('lit').ReactiveControllerHost & Element} */
  #host;

  /** @param {import('lit').ReactiveControllerHost & Element} host */
  constructor(host) {
    this.#host = host;
    host.addController(this);
  }

  /**
   * Call with the popup's open state whenever it changes.
   * @param {boolean} open
   */
  set(open) {
    // The host's own window: a popup inside an iframe follows the iframe's viewport.
    if (open && !this.#release) this.#release = trackVisualViewport(this.#host.ownerDocument?.defaultView ?? globalThis.window);
    else if (!open && this.#release) {
      this.#release();
      this.#release = null;
    }
  }

  hostDisconnected() {
    this.set(false);
  }
}
