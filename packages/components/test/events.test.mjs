// The event naming rule (docs/events.md), checked on every Focsd manifest: native names only where
// the meaning is native (`input`, `change`, `toggle`, `close`, `cancel`), everything else `focsd-*`.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { eventNameViolations, isAllowedEventName, untypedCustomEvents } from '../../../scripts/lib/events.mjs';

const root = new URL('../../../', import.meta.url).pathname;
const cem = new URL('../node_modules/.bin/cem', import.meta.url).pathname;
const scratch = mkdtempSync(join(tmpdir(), 'focsd-events-'));

afterAll(() => rmSync(scratch, { recursive: true, force: true }));

/** @param {string} path */
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

/**
 * The sibling packages are built after components, so analyze their sources here rather than
 * read a manifest that may be stale.
 * @param {string} pkg
 */
function analyze(pkg) {
  const outdir = join(scratch, pkg);

  execFileSync(cem, ['analyze', '--globs', `packages/${pkg}/src/**/*.js`, '--litelement', '--outdir', relative(root, outdir)], {
    cwd: root,
    stdio: 'pipe',
  });

  return readJson(join(outdir, 'custom-elements.json'));
}

const manifests = {
  components: readJson(new URL('../custom-elements.json', import.meta.url).pathname),
  'data-grid': analyze('data-grid'),
  charts: analyze('charts'),
  ai: analyze('ai'),
  editor: analyze('editor'),
};

/** @param {any} manifest */
const eventNames = (manifest) =>
  manifest.modules.flatMap((/** @type {any} */ m) =>
    (m.declarations ?? []).flatMap((/** @type {any} */ d) => (d.events ?? []).map((/** @type {any} */ e) => e.name)),
  );

describe('event names', () => {
  it('accepts native names and focsd-* names only', () => {
    expect(['input', 'change', 'toggle', 'close', 'cancel', 'focsd-select', 'focsd-page-change'].every(isAllowedEventName)).toBe(true);
    expect(['select', 'sort', 'sort-change', 'focsd-', 'focsd-Select', 'focsd--x', undefined].some(isAllowedEventName)).toBe(false);
  });

  it.each(Object.keys(manifests))('%s fires only native or focsd-* events', (pkg) => {
    expect(eventNameViolations(manifests[/** @type {keyof typeof manifests} */ (pkg)])).toEqual([]);
  });

  it.each(Object.keys(manifests))('%s types every CustomEvent detail', (pkg) => {
    expect(untypedCustomEvents(manifests[/** @type {keyof typeof manifests} */ (pkg)])).toEqual([]);
  });

  it('keeps the private tree item signal out of the manifest', () => {
    expect(eventNames(manifests.components)).not.toContain('focsd-tree-item-change');
  });
});

/**
 * The characters of `text` from `start` that are code, with their index: the contents of string
 * and template literals (quotes included) are skipped, so a `)` or `,` inside one is not structure.
 * @param {string} text
 * @param {number} [start]
 * @returns {Generator<[number, string]>}
 */
function* codeChars(text, start = 0) {
  /** @type {string | null} */
  let quote = null;

  for (let i = start; i < text.length; i += 1) {
    const ch = /** @type {string} */ (text[i]);

    if (quote) {
      if (ch === '\\') i += 1;
      else if (ch === quote) quote = null;
    } else if (`'"\``.includes(ch)) quote = ch;
    else yield [i, ch];
  }
}

/**
 * The arguments of the call that opens at `start` (just after its `(`), up to the matching `)`.
 * @param {string} text
 * @param {number} start
 */
function callArgs(text, start) {
  let depth = 1;

  for (const [i, ch] of codeChars(text, start)) {
    depth += Number(ch === '(') - Number(ch === ')');

    if (depth === 0) return text.slice(start, i);
  }

  return text.slice(start);
}

/**
 * Every `new Event('…'`, `new CustomEvent('…'` and `new CommandEvent('…'` call with a literal name
 * in a package's sources: the file, the event name and the call's arguments.
 * @param {string} pkg
 */
function dispatches(pkg) {
  const dir = join(root, 'packages', pkg, 'src');

  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.js'))
    .flatMap((file) => {
      const text = readFileSync(join(dir, file), 'utf8');

      return [...text.matchAll(/new (?:Custom|Command)?Event\('([a-z-]+)'/g)].map((m) => ({
        file: `${pkg}/${file}`,
        name: m[1],
        call: callArgs(text, /** @type {number} */ (m.index) + m[0].length - m[1].length - 2),
      }));
    });
}

/** Native names that do not bubble on the native element (`<dialog>`, `<details>`). */
const NATIVE_NON_BUBBLING = new Set(['toggle', 'close', 'cancel']);

/**
 * Exceptions to the bubbling rule (docs/events.md), one per event: an event name alone, or
 * `<file> <event>`. `focsd-command` is a `CommandEvent` fired on the target, as the native
 * `command` event is. This list only shrinks.
 */
const EXCEPTIONS = new Set(['focsd-command']);

/** @param {{ file: string, name: string }} d */
const excepted = (d) => EXCEPTIONS.has(d.name) || EXCEPTIONS.has(`${d.file} ${d.name}`);

/**
 * Whether the call's options (its second argument) set `bubbles: true` as their own property, so a
 * `bubbles` key inside `detail` does not count.
 * @param {string} call the arguments, from the event name on
 */
function bubbles(call) {
  let depth = 0;
  let arg = 0;

  for (const [i, ch] of codeChars(call)) {
    if ('({['.includes(ch)) depth += 1;
    else if (')}]'.includes(ch)) depth -= 1;
    else if (ch === ',' && depth === 0) arg += 1;
    else if (arg === 1 && depth === 1 && /^bubbles:\s*true\b/.test(call.slice(i))) return true;
  }

  return false;
}

/** True when the dispatch breaks the rule: `toggle`, `close`, `cancel` stay put; the rest bubble. */
const breaksRule = (/** @type {{ file: string, name: string, call: string }} */ d) =>
  !excepted(d) && bubbles(d.call) === NATIVE_NON_BUBBLING.has(d.name);

/**
 * Events the literal-name check cannot see: a name from a variable or template, or an event class
 * of its own. Each would need its bubbling checked by hand, so none may appear.
 * @param {string} pkg
 * @param {string[]} [texts] sources to check instead of the package's (for the test of the check)
 */
function uncheckedDispatches(pkg, texts) {
  const dir = join(root, 'packages', pkg, 'src');

  const files =
    texts?.map((text, i) => [`${pkg}/${i}`, text]) ??
    readdirSync(dir, { recursive: true, encoding: 'utf8' })
      .filter((file) => file.endsWith('.js'))
      .map((file) => [`${pkg}/${file}`, readFileSync(join(dir, file), 'utf8')]);

  return files.flatMap(([file, text]) =>
    [...text.matchAll(/new (?:Custom|Command)?Event\((?!')|extends (?:Custom)?Event\b/g)].map((m) => `${file}: ${m[0]}`),
  );
}

const PACKAGES = ['primitives', 'components', 'data-grid', 'charts', 'editor'];

describe('event bubbling', () => {
  it.each(PACKAGES)('%s: focsd-*, input and change bubble; toggle, close and cancel do not', (pkg) => {
    const offenders = dispatches(pkg)
      .filter(breaksRule)
      .map(({ file, name, call }) => `${file} ${name}: ${call}`);

    expect(offenders).toEqual([]);
  });

  it('flags a non-bubbling focsd-* or change and a bubbling close', () => {
    const at = (/** @type {string} */ name, /** @type {string} */ options) => ({ file: 'x/y.js', name, call: `'${name}', ${options}` });

    expect([at('focsd-x', ''), at('change', '{ cancelable: true }'), at('close', '{ bubbles: true }')].every(breaksRule)).toBe(true);
    expect(
      [at('focsd-x', '{ bubbles: true }'), at('input', '{ bubbles: true, composed: true }'), at('cancel', '{ cancelable: true }')].some(
        breaksRule,
      ),
    ).toBe(false);
  });

  it('reads bubbles from the options, not from inside the detail (14b-11 re-review)', () => {
    const at = (/** @type {string} */ call) => ({ file: 'x/y.js', name: 'focsd-x', call });

    expect(breaksRule(at("'focsd-x', { detail: { bubbles: true } }"))).toBe(true);
    expect(breaksRule(at("'focsd-x', { detail: { value: f(a, b) }, bubbles: true }"))).toBe(false);
  });

  it('skips brackets and commas inside string and template literals (B14 m9)', () => {
    const at = (/** @type {string} */ call) => ({ file: 'x/y.js', name: 'focsd-x', call });

    expect(breaksRule(at("'focsd-x', { detail: { sep: ')' }, bubbles: true }"))).toBe(false);
    expect(breaksRule(at('\'focsd-x\', { detail: { sep: "}, x" }, bubbles: true }'))).toBe(false);
    expect(breaksRule(at("'focsd-x', { detail: { text: `a, ${b}) {` }, bubbles: true }"))).toBe(false);
    expect(breaksRule(at("'focsd-x', { detail: { text: 'bubbles: true' } }"))).toBe(true);
    expect(callArgs("new CustomEvent('focsd-x', { detail: ')' })); next()", 16)).toBe("'focsd-x', { detail: ')' }");
  });

  it('every event is built with a literal name from Event, CustomEvent or CommandEvent (14b-11 re-review)', () => {
    const unchecked = PACKAGES.flatMap((pkg) => uncheckedDispatches(pkg));

    expect(unchecked).toEqual([]);
    expect(uncheckedDispatches('x', ['new Event(name);', 'new CustomEvent(`focsd-${kind}`);', 'class Done extends Event {}'])).toHaveLength(
      3,
    );
  });

  it('keeps every exception in use', () => {
    const all = PACKAGES.flatMap(dispatches);
    const unused = [...EXCEPTIONS].filter((key) => !all.some((d) => d.name === key || `${d.file} ${d.name}` === key));

    expect(unused).toEqual([]);
  });

  it('finds the dispatches it checks', () => {
    const names = new Set(dispatches('primitives').map((d) => d.name));

    expect(dispatches('primitives').length).toBeGreaterThan(40);
    expect(['input', 'change', 'toggle', 'close', 'cancel', 'focsd-open'].filter((n) => !names.has(n))).toEqual([]);
  });
});

describe('event composition', () => {
  it('no focsd-* event is composed: they stay inside the tree they were fired in (docs/events.md rule 4)', () => {
    const composed = PACKAGES.flatMap(dispatches).flatMap((d) =>
      d.name.startsWith('focsd-') && !EXCEPTIONS.has(d.name) && /composed:\s*true/.test(d.call) ? [`${d.file} ${d.name}`] : [],
    );

    expect(composed).toEqual([]);
  });
});
