import { describe, expect, it } from 'vitest';
import { trackVisualViewport, VisualViewportController } from '../src/internal/viewport.js';

/** A window stand-in: a visual viewport that can resize, and a root element with a style. */
function fakeWindow(height = 800) {
  const listeners = new Map();
  const props = new Map();

  const visualViewport = {
    height,
    addEventListener: (type, fn) => listeners.set(type, [...(listeners.get(type) ?? []), fn]),
    removeEventListener: (type, fn) =>
      listeners.set(
        type,
        (listeners.get(type) ?? []).filter((f) => f !== fn),
      ),
  };

  const fire = (type) => (listeners.get(type) ?? []).forEach((fn) => fn());

  const root = {
    style: {
      setProperty: (name, value) => props.set(name, value),
      removeProperty: (name) => props.delete(name),
    },
  };

  return { win: { visualViewport, document: { documentElement: root } }, props, listeners, fire };
}

const VAR = '--_focsd-visual-viewport-height';

describe('trackVisualViewport', () => {
  it('publishes the visual viewport height as a custom property while held', () => {
    const { win, props } = fakeWindow(640);
    const release = trackVisualViewport(win);
    expect(props.get(VAR)).toBe('640px');
    release();
    expect(props.has(VAR)).toBe(false);
  });

  it('follows the viewport as the on-screen keyboard resizes it', () => {
    const { win, props, fire } = fakeWindow(800);
    const release = trackVisualViewport(win);
    win.visualViewport.height = 420;
    fire('resize');
    expect(props.get(VAR)).toBe('420px');
    release();
  });

  it('keeps tracking until the last holder releases (nested popups)', () => {
    const { win, props, listeners } = fakeWindow(700);
    const a = trackVisualViewport(win);
    const b = trackVisualViewport(win);
    a();
    expect(props.get(VAR)).toBe('700px');
    b();
    expect(props.has(VAR)).toBe(false);
    expect(listeners.get('resize')).toHaveLength(0);
  });

  it('ignores a second call to the same release', () => {
    const { win, props } = fakeWindow(700);
    const a = trackVisualViewport(win);
    const b = trackVisualViewport(win);
    a();
    a();
    expect(props.get(VAR)).toBe('700px');
    b();
  });

  it('is a no-op without a visual viewport (server, old browsers)', () => {
    const release = trackVisualViewport({ document: { documentElement: { style: {} } } });
    expect(() => release()).not.toThrow();
    expect(() => trackVisualViewport(undefined)()).not.toThrow();
  });
});

describe('VisualViewportController', () => {
  it('tracks the window the host lives in (an iframe, not the top window)', () => {
    const frame = fakeWindow(333);
    const host = { addController() {}, ownerDocument: { defaultView: frame.win } };
    const controller = new VisualViewportController(host);
    controller.set(true);
    expect(frame.props.get(VAR)).toBe('333px');
    controller.set(false);
    expect(frame.props.has(VAR)).toBe(false);
  });
});
