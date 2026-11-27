import { openModals } from './open-modals.js';
import { warnOnce } from './warn.js';

/**
 * @typedef {object} ShortcutOptions
 * @property {Element | Document} [scope] Where the shortcut is active; an element scope fires only while focus is inside it. Default: the document.
 * @property {boolean} [allowInInputs] Also fire while typing in a field. Default: false.
 * @property {boolean} [preventDefault] Call `preventDefault()` when it fires. Default: true.
 * @property {string} [description] Shown by `listShortcuts()` in a help dialog.
 */

/** @typedef {Omit<ShortcutOptions, 'scope'> & { id: string, want: Want, keys: string, ref: WeakRef<Element | Document>, fn: (event: KeyboardEvent) => void }} Entry */
/** @typedef {{ key: string, ctrl: boolean, alt: boolean, shift: boolean, meta: boolean }} Want */

/** Registered shortcuts in registration order; scopes are held weakly, so an unmounted view is not kept alive. @type {Entry[]} */
let entries = [];

/** The live entries (a shortcut whose scope element was collected is dropped). */
const live = () => (entries = entries.filter((e) => e.ref.deref()));

/** Scopes that already have their one keydown listener (it idles when the scope has no shortcuts left). @type {WeakSet<Element | Document>} */
const listening = new WeakSet();

/** Typing in a field, a contenteditable region or (through the composed path) a field inside a component. Checkboxes, radios and buttons take no text. */
const EDITABLE =
  'input:not([type=checkbox],[type=radio],[type=button],[type=submit],[type=reset]),textarea,select,[contenteditable]:not([contenteditable="false"])';

/** Key names that cannot be written in a chord as they are. @type {Record<string, string>} */
const ALIASES = { space: ' ', plus: '+', esc: 'escape' };

/** `'Mod+K'` to its parts, with `mod` resolved for this platform. @param {string} keys @returns {Want} */
function parse(keys) {
  const parts = keys.toLowerCase().split('+');
  const last = /** @type {string} */ (parts.pop());
  const key = ALIASES[last] ?? last;

  if (!key) throw new Error(`Focsd: no key in "${keys}"`);

  const flags = new Set(
    parts.map((part) => {
      // A typo such as "cmd" must not turn a chord into a bare character shortcut.
      if (!/^(mod|ctrl|alt|shift|meta)$/.test(part)) throw new Error(`Focsd: unknown modifier "${part}" in "${keys}"`);

      return part === 'mod'
        ? /mac|iphone|ipad/i.test(
            /** @type {{ userAgentData?: { platform?: string } }} */ (navigator).userAgentData?.platform || navigator.platform,
          )
          ? 'meta'
          : 'ctrl'
        : part;
    }),
  );

  return { key, ctrl: flags.has('ctrl'), alt: flags.has('alt'), shift: flags.has('shift'), meta: flags.has('meta') };
}

/** Whether the keydown is this chord. @param {KeyboardEvent} e @param {Want} w */
function matches(e, w) {
  // Autofill and some extensions dispatch a keydown with no key.
  const typed = e.key?.toLowerCase();

  return (
    Boolean(typed) &&
    // A letter also matches by physical key, so a chord works on a Cyrillic or Greek layout.
    (typed === w.key || (/^[a-z]$/.test(w.key) && typed > 'z' && e.code === `Key${w.key.toUpperCase()}`)) &&
    e.ctrlKey === w.ctrl &&
    e.altKey === w.alt &&
    e.metaKey === w.meta &&
    // A symbol such as "?" needs Shift on some layouts and not on others, so Shift is not compared for it.
    (!/[a-z\d]/.test(w.key) || e.shiftKey === w.shift) &&
    // On Windows AltGr arrives as Ctrl+Alt and types a character; it is not a chord.
    !(e.ctrlKey && e.altKey && e.getModifierState('AltGraph'))
  );
}

/** @param {Element | Document} scope */
function listen(scope) {
  /** @param {KeyboardEvent} e */
  const onKeydown = (e) => {
    // Held keys, IME composition (keyCode 229 is the process key) and a key a component already
    // used (or a shortcut in an inner scope already took) are never shortcuts.
    if (e.defaultPrevented || e.isComposing || e.repeat || e.keyCode === 229) return;

    /** @param {string} selector */
    const hit = (selector) => /** @type {Element[]} */ (e.composedPath()).filter((el) => el?.matches?.(selector));
    const entry = live().findLast((x) => x.ref.deref() === scope && matches(e, x.want));

    if (!entry || (!entry.allowInInputs && hit(EDITABLE).length)) return;

    // An open modal that does not contain the scope makes the page behind it inert, so stay quiet.
    // Native modals are found through the event path; open Focsd modals anywhere, through the shared set.
    const modals = [...hit(':modal'), ...openModals];

    if (modals.some((m) => !m.contains(/** @type {Node} */ (scope)))) return;

    if (entry.preventDefault !== false) e.preventDefault();
    entry.fn(e);
  };

  scope.addEventListener('keydown', /** @type {EventListener} */ (onKeydown));
  listening.add(scope);
}

/**
 * Register an app-level keyboard shortcut. It stays quiet while the user types in a field or
 * composes text with an IME, while a key is held down, and while a modal is open elsewhere.
 *
 * `keys` is one chord such as `'mod+k'`, `'shift+?'` or `'alt+n'`; `mod` is Command on Apple
 * platforms and Ctrl elsewhere. A shortcut with no modifier fires from a single character, so give
 * users a way to turn it off or remap it (WCAG 2.1.4), or scope it to an element so it only works
 * while focus is inside.
 *
 * Registering the same chord in the same scope again replaces the first one. The same chord in an
 * element scope and on the page fires once: the inner scope takes it. `space`, `plus` and `esc`
 * name those keys; an unknown modifier throws.
 * @param {string} keys
 * @param {(event: KeyboardEvent) => void} handler
 * @param {ShortcutOptions} [options]
 * @returns {() => void} Unregister.
 */
export function registerShortcut(keys, handler, options = {}) {
  const want = parse(keys);
  const { scope = document, ...rest } = options;
  const id = Object.values(want).join();
  const previous = live().find((e) => e.ref.deref() === scope && e.id === id);
  /** @type {Entry} */
  const entry = { ...rest, id, want, keys, ref: new WeakRef(scope), fn: handler };

  if (previous) warnOnce(`shortcut:${id}`, `"${keys}" is registered twice.`);

  if (scope === document && !(want.ctrl || want.alt || want.meta))
    warnOnce('shortcut:single', `"${keys}": a page-wide character shortcut needs an off switch or a scope (WCAG 2.1.4).`);

  entries = [...entries.filter((e) => e !== previous), entry];

  if (!listening.has(scope)) listen(scope);

  return () => {
    entries = entries.filter((e) => e !== entry);
  };
}

/**
 * The registered shortcuts, for a help dialog, so they can be found.
 * @returns {{ keys: string, description: string }[]}
 */
export const listShortcuts = () => live().map(({ keys, description = '' }) => ({ keys, description }));
