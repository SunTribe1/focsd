// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { trackModal } from '../src/internal/open-modals.js';
import { listShortcuts, registerShortcut } from '../src/internal/shortcuts.js';

/** @type {Array<() => void>} */
let cleanups = [];

const reg = (...args) => {
  const off = registerShortcut(...args);

  cleanups.push(off);

  return off;
};

/** Fire a keydown at a target and report whether the page default was prevented. */
function press(target, key, init = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true, ...init });

  target.dispatchEvent(event);

  return event;
}

function stubPlatform(platform, uaPlatform) {
  vi.stubGlobal('navigator', { platform, userAgentData: uaPlatform ? { platform: uaPlatform } : undefined });
}

/** An open modal dialog; happy-dom keeps `:modal` false, so the instance answers it as a browser does. */
function openModal(parent) {
  const dialog = document.createElement('dialog');
  const matches = dialog.matches.bind(dialog);

  dialog.matches = (selector) => (selector === ':modal' ? dialog.open : matches(selector));
  parent.append(dialog);
  dialog.showModal();

  return dialog;
}

beforeEach(() => {
  document.body.innerHTML = '';
  stubPlatform('Win32');
});

afterEach(() => {
  for (const off of cleanups) off();
  cleanups = [];
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('registerShortcut', () => {
  it('fires on the chord, passes the event and prevents the default', () => {
    const handler = vi.fn();

    reg('mod+k', handler);
    const event = press(document.body, 'k', { ctrlKey: true });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toBe(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('keeps the default when preventDefault is false', () => {
    reg('mod+k', () => {}, { preventDefault: false });

    expect(press(document.body, 'k', { ctrlKey: true }).defaultPrevented).toBe(false);
  });

  it('matches case-insensitively and needs the exact modifiers', () => {
    const handler = vi.fn();

    reg('alt+n', handler);
    press(document.body, 'N', { altKey: true });
    press(document.body, 'n');
    press(document.body, 'n', { altKey: true, shiftKey: true });
    press(document.body, 'n', { altKey: true, ctrlKey: true });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('matches symbol keys with shift implied by the layout', () => {
    const handler = vi.fn();

    reg('shift+?', handler);
    press(document.body, '?', { shiftKey: true });
    press(document.body, '?');

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('falls back to event.code for letters on non-Latin layouts', () => {
    const handler = vi.fn();

    reg('mod+k', handler);
    press(document.body, 'л', { ctrlKey: true, code: 'KeyK' });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not use the code fallback when the key is a Latin letter', () => {
    const handler = vi.fn();

    reg('mod+k', handler);
    press(document.body, 'j', { ctrlKey: true, code: 'KeyK' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores AltGraph typing', () => {
    const handler = vi.fn();

    reg('alt+ctrl+q', handler);
    const event = new KeyboardEvent('keydown', { key: 'q', ctrlKey: true, altKey: true, bubbles: true });

    event.getModifierState = (name) => name === 'AltGraph';
    document.body.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
  });
});

describe('matching, continued', () => {
  it('matches named keys such as Escape and ArrowUp', () => {
    const handler = vi.fn();

    reg('shift+ArrowUp', handler);
    press(document.body, 'ArrowUp', { shiftKey: true });

    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('platform modifier', () => {
  it('maps mod to Meta on Apple platforms', () => {
    stubPlatform('MacIntel');
    const handler = vi.fn();

    reg('mod+k', handler);
    press(document.body, 'k', { ctrlKey: true });
    press(document.body, 'k', { metaKey: true });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('prefers userAgentData.platform over navigator.platform', () => {
    stubPlatform('', 'macOS');
    const handler = vi.fn();

    reg('mod+k', handler);
    press(document.body, 'k', { metaKey: true });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('maps mod to Ctrl elsewhere', () => {
    const handler = vi.fn();

    reg('mod+k', handler);
    press(document.body, 'k', { metaKey: true });
    press(document.body, 'k', { ctrlKey: true });

    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('ignored situations', () => {
  it.each(['input', 'textarea', 'select'])('does not fire in a %s', (tag) => {
    const handler = vi.fn();
    const field = document.body.appendChild(document.createElement(tag));

    reg('mod+k', handler);
    press(field, 'k', { ctrlKey: true });

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not fire in a contenteditable region (or inside one)', () => {
    const handler = vi.fn();
    const editor = document.body.appendChild(document.createElement('div'));
    const inner = editor.appendChild(document.createElement('span'));

    editor.setAttribute('contenteditable', 'true');
    reg('mod+k', handler);
    press(inner, 'k', { ctrlKey: true });

    expect(handler).not.toHaveBeenCalled();
  });
});

describe('ignored situations, continued', () => {
  it('does not fire for a field inside a shadow root (the composed target)', () => {
    const handler = vi.fn();
    const host = document.body.appendChild(document.createElement('div'));
    const input = host.attachShadow({ mode: 'open' }).appendChild(document.createElement('input'));

    reg('mod+k', handler);
    press(input, 'k', { ctrlKey: true });

    expect(handler).not.toHaveBeenCalled();
  });

  it('fires in a field when allowInInputs is set', () => {
    const handler = vi.fn();
    const field = document.body.appendChild(document.createElement('input'));

    reg('mod+k', handler, { allowInInputs: true });
    press(field, 'k', { ctrlKey: true });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not fire while composing (IME) or on key repeat', () => {
    const handler = vi.fn();

    reg('mod+k', handler);
    const composing = press(document.body, 'k', { ctrlKey: true, isComposing: true });
    const repeated = press(document.body, 'k', { ctrlKey: true, repeat: true });

    expect(handler).not.toHaveBeenCalled();
    expect(composing.defaultPrevented).toBe(false);
    expect(repeated.defaultPrevented).toBe(false);
  });

  it('does not fire for the IME process key', () => {
    const handler = vi.fn();

    reg('mod+k', handler);
    press(document.body, 'Process', { ctrlKey: true, keyCode: 229 });

    expect(handler).not.toHaveBeenCalled();
  });
});

describe('modals', () => {
  it('does not fire while a modal dialog is open elsewhere', () => {
    const handler = vi.fn();
    const dialog = openModal(document.body);

    reg('mod+k', handler);
    press(dialog, 'k', { ctrlKey: true });

    expect(handler).not.toHaveBeenCalled();
  });

  it("does not fire while a Focsd modal is open, even inside another component's shadow root (review item 128)", () => {
    const handler = vi.fn();
    const host = document.body.appendChild(document.createElement('div'));
    const modal = host.attachShadow({ mode: 'open' }).appendChild(document.createElement('div'));

    trackModal(modal, true);
    reg('mod+k', handler);
    press(document.body, 'k', { ctrlKey: true });
    expect(handler).not.toHaveBeenCalled();

    trackModal(modal, false);
    press(document.body, 'k', { ctrlKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('fires again once the modal closes', () => {
    const handler = vi.fn();
    const dialog = openModal(document.body);

    reg('mod+k', handler);
    dialog.close();
    press(document.body, 'k', { ctrlKey: true });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('fires inside a modal when the scope is within it', () => {
    const handler = vi.fn();
    const dialog = openModal(document.body);
    const scope = dialog.appendChild(document.createElement('div'));
    const button = scope.appendChild(document.createElement('button'));

    reg('mod+k', handler, { scope });
    press(button, 'k', { ctrlKey: true });

    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('scope', () => {
  it('fires only while focus is inside an element scope', () => {
    const handler = vi.fn();
    const scope = document.body.appendChild(document.createElement('div'));
    const inside = scope.appendChild(document.createElement('button'));
    const outside = document.body.appendChild(document.createElement('button'));

    reg('alt+n', handler, { scope });
    press(outside, 'n', { altKey: true });
    press(inside, 'n', { altKey: true });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('keeps separate scopes separate (no duplicate warning across scopes)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const a = document.body.appendChild(document.createElement('div'));
    const b = document.body.appendChild(document.createElement('div'));
    const one = vi.fn();
    const two = vi.fn();

    reg('alt+n', one, { scope: a });
    reg('alt+n', two, { scope: b });
    press(b, 'n', { altKey: true });

    expect(one).not.toHaveBeenCalled();
    expect(two).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('unregister and duplicates', () => {
  it('stops firing after unregister, and a second call is harmless', () => {
    const handler = vi.fn();
    const off = reg('mod+k', handler);

    off();
    off();
    press(document.body, 'k', { ctrlKey: true });

    expect(handler).not.toHaveBeenCalled();
    expect(listShortcuts()).toEqual([]);
  });

  it('lets the second registration of a chord win and warns once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const first = vi.fn();
    const second = vi.fn();

    reg('mod+j', first);
    reg('mod+j', second);
    reg('MOD+J', vi.fn());
    press(document.body, 'j', { ctrlKey: true });

    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled(); // the third replaced it
    expect(warn.mock.calls.filter(([m]) => /mod\+j/i.test(m)).length).toBeLessThanOrEqual(1);
    expect(warn).toHaveBeenCalled();
  });

  it('the replaced registration cannot remove its replacement', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const second = vi.fn();
    const offFirst = reg('mod+m', vi.fn());

    reg('mod+m', second);
    offFirst();
    press(document.body, 'm', { ctrlKey: true });

    expect(second).toHaveBeenCalledTimes(1);
  });
});

describe('single character shortcuts', () => {
  it('warns once about a bare character key on the whole page (WCAG 2.1.4)', async () => {
    vi.resetModules();
    const fresh = await import('../src/internal/shortcuts.js');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    cleanups.push(
      fresh.registerShortcut('x', () => {}),
      fresh.registerShortcut('y', () => {}),
    );

    expect(warn.mock.calls.filter(([m]) => /2\.1\.4|single character/i.test(m))).toHaveLength(1);
  });

  it('does not warn for a bare key inside an element scope', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    reg('j', () => {}, { scope: document.body.appendChild(document.createElement('div')) });

    expect(warn).not.toHaveBeenCalled();
  });

  it('throws a clear error for an empty or modifier-only chord', () => {
    expect(() => registerShortcut('', () => {})).toThrow(/key/i);
    expect(() => registerShortcut('mod+', () => {})).toThrow(/key/i);
  });
});

describe('listShortcuts', () => {
  it('lists keys and description for a help dialog, in registration order', () => {
    reg('mod+k', () => {}, { description: 'Open the command palette' });
    reg('shift+?', () => {});

    expect(listShortcuts()).toEqual([
      { keys: 'mod+k', description: 'Open the command palette' },
      { keys: 'shift+?', description: '' },
    ]);
  });

  it('returns a fresh array each call', () => {
    reg('mod+k', () => {});
    const list = listShortcuts();

    list.pop();

    expect(listShortcuts()).toHaveLength(1);
  });
});

describe('wave 20 fixes: parsing', () => {
  it.each([['cmd+k'], ['option+n'], ['control+k'], ['command+k'], ['mod+ctl+k']])('throws on the unknown modifier in "%s" (I4)', (keys) => {
    expect(() => registerShortcut(keys, () => {})).toThrow(/unknown modifier/);
    expect(listShortcuts()).toEqual([]);
  });

  it('names the modifier and the chord in the error', () => {
    expect(() => registerShortcut('cmd+k', () => {})).toThrow('Focsd: unknown modifier "cmd" in "cmd+k"');
  });

  it.each([
    ['mod+space', ' '],
    ['mod+plus', '+'],
    ['esc', 'Escape'],
  ])('"%s" matches the key %j (minor 11)', (keys, key) => {
    const handler = vi.fn();

    reg(keys, handler, { scope: document.body });
    press(document.body, key, { ctrlKey: keys.startsWith('mod') });

    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('wave 20 fixes: key handling', () => {
  it('ignores a keydown without a key (autofill) instead of throwing (I5)', () => {
    const handler = vi.fn();
    const errors = [];
    const onError = (/** @type {ErrorEvent} */ e) => errors.push(e.error);

    reg('mod+k', handler);
    window.addEventListener('error', onError);

    try {
      expect(() => document.body.dispatchEvent(new Event('keydown', { bubbles: true }))).not.toThrow();
      document.body.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
    } finally {
      window.removeEventListener('error', onError);
    }

    expect(errors).toEqual([]);
    expect(handler).not.toHaveBeenCalled();
  });

  it.each(['checkbox', 'radio', 'button', 'submit', 'reset'])('fires while focus is on an input type=%s (minor 12)', (type) => {
    const handler = vi.fn();
    const input = document.body.appendChild(document.createElement('input'));

    input.type = type;
    reg('mod+k', handler);
    press(input, 'k', { ctrlKey: true });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it.each(['text', 'search', 'range', 'number'])('still does not fire in an input type=%s', (type) => {
    const handler = vi.fn();
    const input = document.body.appendChild(document.createElement('input'));

    input.type = type;
    reg('mod+k', handler);
    press(input, 'k', { ctrlKey: true });

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not fire for a keydown a component already handled (defaultPrevented), so an element and a page shortcut do not both fire (minor 13)', () => {
    const page = vi.fn();
    const local = vi.fn();
    const scope = document.body.appendChild(document.createElement('div'));
    const inside = scope.appendChild(document.createElement('button'));

    reg('alt+n', page);
    reg('alt+n', local, { scope });
    press(inside, 'n', { altKey: true });
    expect(local).toHaveBeenCalledTimes(1);
    expect(page).not.toHaveBeenCalled();

    const other = document.body.appendChild(document.createElement('button'));

    other.addEventListener('keydown', (e) => e.preventDefault());
    press(other, 'n', { altKey: true });
    expect(page).not.toHaveBeenCalled();
  });
});

describe('wave 20 fixes: element scopes are held weakly (minor 13)', () => {
  it('keeps an element scope in a WeakRef and drops the shortcut once the element is gone', () => {
    /** @type {Set<object>} */
    const collected = new Set();
    /** @type {unknown[]} */
    const held = [];

    vi.stubGlobal(
      'WeakRef',
      class {
        /** @param {object} target */
        constructor(target) {
          held.push(target);
          this.target = target;
        }

        deref() {
          return collected.has(this.target) ? undefined : this.target;
        }
      },
    );
    const scope = document.body.appendChild(document.createElement('div'));
    const handler = vi.fn();

    reg('alt+n', handler, { scope, description: 'Next' });
    expect(held).toContain(scope);
    expect(listShortcuts()).toEqual([{ keys: 'alt+n', description: 'Next' }]);

    collected.add(scope);
    expect(listShortcuts()).toEqual([]);
    press(scope, 'n', { altKey: true });
    expect(handler).not.toHaveBeenCalled();
  });
});
