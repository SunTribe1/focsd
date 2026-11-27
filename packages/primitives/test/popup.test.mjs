// cspell:ignore unstub
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HoverIntent, TriggerToggle, isFrom, onFocusLeave } from '../src/internal/popup.js';

/** A minimal Lit-like host: records controllers and listeners, and can disconnect. */
function fakeHost() {
  /** @type {Record<string, Array<(event?: unknown) => void>>} */
  const listeners = {};
  /** @type {Array<{ hostConnected?: () => void, hostDisconnected?: () => void }>} */
  const controllers = [];

  return {
    parentNode: null,
    isConnected: true,
    addController: (/** @type {any} */ c) => controllers.push(c),
    addEventListener: (/** @type {string} */ type, /** @type {any} */ fn) => {
      listeners[type] = [...(listeners[type] ?? []), fn];
    },
    fire: (/** @type {string} */ type) => (listeners[type] ?? []).forEach((fn) => fn({ type })),
    disconnect() {
      this.isConnected = false;
      controllers.forEach((c) => c.hostDisconnected?.());
    },
    reconnect() {
      this.isConnected = true;
      controllers.forEach((c) => c.hostConnected?.());
    },
    controllers,
  };
}

describe('isFrom', () => {
  const el = {};
  const event = (/** @type {unknown[]} */ path) => /** @type {Event} */ (/** @type {unknown} */ ({ composedPath: () => path }));

  it('is true when the element is on the composed path', () => {
    expect(isFrom(event([{}, el, {}]), /** @type {any} */ (el))).toBe(true);
  });
  it('is false when it is not, or when there is no element', () => {
    expect(isFrom(event([{}]), /** @type {any} */ (el))).toBe(false);
    expect(isFrom(event([el]), null)).toBe(false);
    expect(isFrom(event([el]), undefined)).toBe(false);
  });
});

describe('TriggerToggle', () => {
  it('reports open when the popup was open at pointerdown, though light dismiss closed it before the click', () => {
    let open = true;
    const toggle = new TriggerToggle(() => open);
    toggle.press(new EventTarget());
    open = false; // popover=auto light-dismissed between pointerdown and click
    expect(toggle.release()).toBe(true);
  });
  it('reports closed when the popup was closed at pointerdown and at click', () => {
    const toggle = new TriggerToggle(() => false);
    toggle.press(new EventTarget());
    expect(toggle.release()).toBe(false);
  });
  it('falls back to the current state when there was no pointerdown (keyboard click)', () => {
    expect(new TriggerToggle(() => true).release()).toBe(true);
    expect(new TriggerToggle(() => false).release()).toBe(false);
  });
  it('forgets the pointerdown state after each click', () => {
    let open = true;
    const toggle = new TriggerToggle(() => open);
    toggle.press(new EventTarget());
    open = false;
    toggle.release();
    expect(toggle.release()).toBe(false);
  });
});

/** An EventTarget that counts its live listeners: a repeat add or a stray remove changes nothing, as in the DOM. */
const countingTarget = () => {
  const target = new EventTarget();
  /** @type {[unknown, unknown][]} */
  let pairs = [];
  const add = target.addEventListener.bind(target);
  const remove = target.removeEventListener.bind(target);
  target.addEventListener = (/** @type {any[]} */ ...args) => {
    if (!pairs.some(([type, fn]) => type === args[0] && fn === args[1])) pairs = [...pairs, [args[0], args[1]]];
    add(...args);
  };

  target.removeEventListener = (/** @type {any[]} */ ...args) => {
    pairs = pairs.filter(([type, fn]) => type !== args[0] || fn !== args[1]);
    remove(...args);
  };

  return { target, live: () => pairs.length };
};

it('the listener counter ignores a repeat add and a stray remove', () => {
  const { target, live } = countingTarget();
  const listener = () => {};

  target.removeEventListener('keydown', listener);
  expect(live()).toBe(0);
  target.addEventListener('keydown', listener);
  target.addEventListener('keydown', listener);
  expect(live()).toBe(1);
});

describe('TriggerToggle gestures (fix round 2: no timers)', () => {
  afterEach(() => vi.useRealTimers());

  it('a delayed click (touch, well after pointerup) still sees the press, and no timer is involved', () => {
    vi.useFakeTimers();
    let open = true;
    const target = new EventTarget();
    const toggle = new TriggerToggle(() => open);
    toggle.press(target);
    open = false; // light dismiss at pointerdown
    target.dispatchEvent(new Event('pointerup'));
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(toggle.release()).toBe(true);
  });
  it('forgets the press on pointercancel', () => {
    let open = true;
    const target = new EventTarget();
    const toggle = new TriggerToggle(() => open);
    toggle.press(target);
    open = false;
    target.dispatchEvent(new Event('pointercancel'));
    expect(toggle.release()).toBe(false);
  });
  it('a keydown after a dragged-off press makes a keyboard click fall back to isOpen()', () => {
    let open = true;
    const target = new EventTarget();
    const toggle = new TriggerToggle(() => open);
    toggle.press(target);
    open = false;
    target.dispatchEvent(new Event('pointerup')); // dragged off: no click follows
    target.dispatchEvent(new Event('keydown'));
    expect(toggle.release()).toBe(false);
  });
  it('release() consumes the press, so a second click does not reuse it', () => {
    let open = true;
    const target = new EventTarget();
    const toggle = new TriggerToggle(() => open);
    toggle.press(target);
    open = false;
    expect(toggle.release()).toBe(true);
    expect(toggle.release()).toBe(false);
  });
  it('a new press overwrites the record and keeps at most one pair of listeners', () => {
    const { target, live } = countingTarget();
    let open = false;
    const toggle = new TriggerToggle(() => open);
    toggle.press(target);
    expect(live()).toBe(2);
    open = true;
    toggle.press(target);
    expect(live()).toBe(2);
    open = false;
    expect(toggle.release()).toBe(true);
  });
  it('leaves no listeners once the press is consumed or forgotten', () => {
    const consumed = countingTarget();
    const toggle = new TriggerToggle(() => false);
    toggle.press(consumed.target);
    toggle.release();
    expect(consumed.live()).toBe(0);
    const cancelled = countingTarget();
    toggle.press(cancelled.target);
    cancelled.target.dispatchEvent(new Event('pointercancel'));
    expect(cancelled.live()).toBe(0);
    const keyed = countingTarget();
    toggle.press(keyed.target);
    keyed.target.dispatchEvent(new Event('keydown'));
    expect(keyed.live()).toBe(0);
  });
});

describe('onFocusLeave', () => {
  /** @type {{ activeElement: unknown }} */
  let doc;

  class FakeElement {
    /** @param {unknown} parent */
    constructor(parent = null) {
      this.parentNode = parent;
    }
  }

  beforeEach(() => {
    vi.useFakeTimers();
    doc = { activeElement: null };
    vi.stubGlobal('document', doc);
    vi.stubGlobal('HTMLElement', FakeElement);
    vi.stubGlobal('ShadowRoot', class {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('registers itself as a controller', () => {
    const host = fakeHost();
    const controller = onFocusLeave(/** @type {any} */ (host), () => {});
    expect(host.controllers).toContain(controller);
  });
  it('calls back once, after the focus move settles, when focus left the host', () => {
    const host = fakeHost();
    const leave = vi.fn();
    onFocusLeave(/** @type {any} */ (host), leave);
    host.fire('focusout');
    host.fire('focusout'); // focus crossing several shadow roots fires focusout more than once
    expect(leave).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(leave).toHaveBeenCalledTimes(1);
  });
  it('does not call back when focus moved to another element inside the host', () => {
    const host = fakeHost();
    const leave = vi.fn();
    onFocusLeave(/** @type {any} */ (host), leave);
    host.fire('focusout');
    doc.activeElement = new FakeElement(host);
    vi.runAllTimers();
    expect(leave).not.toHaveBeenCalled();
  });
  it('never calls back for a focusout that arrives after disconnect (fix round 1)', () => {
    const host = fakeHost();
    const leave = vi.fn();
    onFocusLeave(/** @type {any} */ (host), leave);
    host.disconnect();
    host.fire('focusout');
    vi.runAllTimers();
    expect(leave).not.toHaveBeenCalled();
  });
  it('re-arms: calls back again when focus leaves a second time (fix round 1)', () => {
    const host = fakeHost();
    const leave = vi.fn();
    onFocusLeave(/** @type {any} */ (host), leave);
    host.fire('focusout');
    vi.runAllTimers();
    host.fire('focusout');
    vi.runAllTimers();
    expect(leave).toHaveBeenCalledTimes(2);
  });
  it('clears the pending check when the host disconnects', () => {
    const host = fakeHost();
    const leave = vi.fn();
    onFocusLeave(/** @type {any} */ (host), leave);
    host.fire('focusout');
    host.disconnect();
    vi.runAllTimers();
    expect(leave).not.toHaveBeenCalled();
  });
});

describe('HoverIntent', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const make = () => {
    const host = fakeHost();
    const show = vi.fn();
    const hide = vi.fn();
    const intent = new HoverIntent(/** @type {any} */ (host), { show, hide });

    return { host, show, hide, intent };
  };

  it('registers itself as a controller and starts disengaged', () => {
    const { host, intent } = make();
    expect(host.controllers).toContain(intent);
    expect(intent.engaged).toBe(false);
  });
  it('shows after the delay', () => {
    const { show, intent } = make();
    intent.showAfter(400);
    vi.advanceTimersByTime(399);
    expect(show).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(show).toHaveBeenCalledTimes(1);
  });
  it('hides after the grace period when neither hovered nor focused', () => {
    const { hide, intent } = make();
    intent.hideAfter(200);
    vi.advanceTimersByTime(200);
    expect(hide).toHaveBeenCalledTimes(1);
  });
  it('does not hide when the pointer or focus came back during the grace period', () => {
    const { hide, intent } = make();
    intent.hideAfter(200);
    intent.setHovered(true);
    vi.advanceTimersByTime(200);
    intent.setHovered(false);
    intent.setFocused(true);
    intent.hideAfter(200);
    vi.advanceTimersByTime(200);
    expect(intent.engaged).toBe(true);
    expect(hide).not.toHaveBeenCalled();
  });
  it('a pending hide cancels a pending show, and the other way round', () => {
    const { show, hide, intent } = make();
    intent.showAfter(100);
    intent.hideAfter(100);
    vi.advanceTimersByTime(100);
    expect(show).not.toHaveBeenCalled();
    expect(hide).toHaveBeenCalledTimes(1);
    intent.hideAfter(100);
    intent.showAfter(100);
    vi.advanceTimersByTime(100);
    expect(show).toHaveBeenCalledTimes(1);
    expect(hide).toHaveBeenCalledTimes(1);
  });
  it('cancelHide keeps a pending show; cancel drops both', () => {
    const { show, hide, intent } = make();
    intent.showAfter(100);
    intent.cancelHide();
    vi.advanceTimersByTime(100);
    expect(show).toHaveBeenCalledTimes(1);
    intent.hideAfter(100);
    intent.cancelHide();
    intent.showAfter(100);
    intent.cancel();
    vi.advanceTimersByTime(100);
    expect(show).toHaveBeenCalledTimes(1);
    expect(hide).not.toHaveBeenCalled();
  });
  it('setHovered and setFocused drive engaged; disconnect resets both (fix round 1)', () => {
    const { host, intent } = make();
    intent.setHovered(true);
    expect(intent.hovered).toBe(true);
    expect(intent.engaged).toBe(true);
    intent.setFocused(true);
    expect(intent.focused).toBe(true);
    host.disconnect();
    expect(intent.hovered).toBe(false);
    expect(intent.focused).toBe(false);
    expect(intent.engaged).toBe(false);
  });
  it('clears both timers when the host disconnects', () => {
    const { host, show, hide, intent } = make();
    intent.showAfter(100);
    host.disconnect();
    intent.hideAfter(100);
    host.disconnect();
    vi.runAllTimers();
    expect(show).not.toHaveBeenCalled();
    expect(hide).not.toHaveBeenCalled();
  });
});

describe('onFocusLeave: a host moved while a check is pending (B8 m3)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('document', { activeElement: null });
    vi.stubGlobal('HTMLElement', class {});
    vi.stubGlobal('ShadowRoot', class {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('checks again on reconnect, so a focus that left before the move still closes', () => {
    const host = fakeHost();
    const leave = vi.fn();
    onFocusLeave(/** @type {any} */ (host), leave);
    host.fire('focusout');
    host.disconnect();
    host.reconnect();
    vi.runAllTimers();
    expect(leave).toHaveBeenCalledTimes(1);
  });

  it('does not check on reconnect when nothing was pending', () => {
    const host = fakeHost();
    const leave = vi.fn();
    onFocusLeave(/** @type {any} */ (host), leave);
    host.disconnect();
    host.reconnect();
    vi.runAllTimers();
    expect(leave).not.toHaveBeenCalled();
  });
});
