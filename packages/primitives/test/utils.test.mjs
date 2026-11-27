// The curated app surface `@focsd-dev/primitives/utils` and the author surface `/internal` (quality
// B10, owner decision S4). Imported by package name in a plain Node process, as a server-rendering
// app would: no DOM shim, so a helper that touches `document` on import fails here.
import { execFileSync } from 'node:child_process';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { announce } from '../src/internal/announce.js';

const cwd = new URL('../', import.meta.url).pathname;

/**
 * Export names of a package entry, imported by name in a fresh Node process (source files through
 * the `development` condition), after running `script` with the module as `m`.
 * @param {string} specifier
 * @param {string} [script]
 * @returns {string[]}
 */
function exportsOf(specifier, script = '') {
  const code = `const m = await import(${JSON.stringify(specifier)}); ${script}; console.log(JSON.stringify(Object.keys(m).sort()));`;
  const out = execFileSync(process.execPath, ['--conditions=development', '--input-type=module', '-e', code], { cwd, encoding: 'utf8' });

  return JSON.parse(out.trim().split('\n').at(-1) ?? '[]');
}

/** The binding table: types-api.md, "Recommended public utility surface". */
const UTILS = [
  'acceptsFile',
  'announce',
  'contrastRatio',
  'deepActiveElement',
  'en',
  'formatBytes',
  'formatColor',
  'formatNational',
  'fromFontAwesome',
  'fromLucide',
  'fromSvgStrings',
  'getLocale',
  'isValidPhone',
  'listShortcuts',
  'minorUnits',
  'parseAmount',
  'parseColor',
  'parseISODate',
  'parsePhone',
  'registerIconLibrary',
  'registerShortcut',
  'registerTranslation',
  'resetSystemIcons',
  'setDefaultIconLibrary',
  'setLinkHandler',
  'setLocale',
  'setSystemIcons',
  'systemIconNames',
  'toISODate',
  'unregisterIconLibrary',
];

/** Author-only helpers: off the root, on `/internal` (no semver promise). */
const AUTHOR_ONLY = [
  'FOCUSABLE',
  'overflowRegions',
  'syncOverflowRegion',
  'addDays',
  'addMonths',
  'composedContains',
  'cssomStyle',
  'defineElement',
  'deprecated',
  'edgeIndex',
  'firstDayOfWeek',
  'firstFocusable',
  'floorCssText',
  'focusWithin',
  'fold',
  'iconPaths',
  'intlOptions',
  'registerPathIconLibrary',
  'LocalizeController',
  'monthWeeks',
  'nextDirection',
  'nextIndex',
  'pageItems',
  'parseFormatShorthand',
  'readOptions',
  'setTriggerState',
  'sortTableRows',
  'startOfWeek',
  'submitterOf',
  'termFor',
  'trackVisualViewport',
  'typeaheadIndex',
  'uid',
  'ViewportWindow',
  'VisualViewportController',
  'warnOnce',
];

describe('@focsd-dev/primitives/utils', () => {
  it('imports in Node (SSR) and exports exactly the curated list', () => {
    expect(exportsOf('@focsd-dev/primitives/utils')).toEqual(UTILS.toSorted());
  });

  it('announce, deepActiveElement and registerTranslation are safe to call on the server', () => {
    const script = `m.announce('Saved'); m.announce('Failed', { politeness: 'assertive' }); m.registerTranslation({ $code: 'xx' }); if (m.deepActiveElement() !== null) throw new Error('focus')`;

    expect(exportsOf('@focsd-dev/primitives/utils', script)).toContain('announce');
  });
});

describe('@focsd-dev/primitives/internal', () => {
  it('imports in Node and carries the author-only helpers', () => {
    expect(exportsOf('@focsd-dev/primitives/internal')).toEqual(AUTHOR_ONLY.toSorted());
  });

  it('the root no longer exports author-only helpers', () => {
    const root = exportsOf('@focsd-dev/primitives');

    expect(root.filter((name) => AUTHOR_ONLY.includes(name))).toEqual([]);
    expect(root).not.toContain('sortRows');
  });
});

/** A document with just enough DOM for the announcer, and synchronous animation frames. */
function fakeDocument() {
  const regions = [];

  const createElement = () => {
    const el = { attributes: {}, style: {}, textContent: '', isConnected: true };

    el.setAttribute = (name, value) => {
      el.attributes[name] = value;
    };

    return el;
  };

  const body = {
    append: (el) => {
      el.parentNode = body;
      regions.push(el);
    },
  };

  return { regions, document: { createElement, body } };
}

describe('announce', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('writes to one shared polite region, and again for a repeated message', () => {
    const { regions, document } = fakeDocument();
    const frames = [];

    vi.stubGlobal('document', document);
    vi.stubGlobal('requestAnimationFrame', (cb) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', () => {});

    announce('Saved');
    announce('Saved');
    expect(regions).toHaveLength(1);
    expect(regions[0].attributes['aria-live']).toBe('polite');
    expect(regions[0].textContent).toBe('');
    frames.at(-1)();
    expect(regions[0].textContent).toBe('Saved');
  });

  it('uses a separate assertive region on request', () => {
    const { regions, document } = fakeDocument();

    vi.stubGlobal('document', document);
    vi.stubGlobal('requestAnimationFrame', (cb) => cb());
    vi.stubGlobal('cancelAnimationFrame', () => {});

    announce('Failed', { politeness: 'assertive' });
    const region = regions.find((r) => r.attributes['aria-live'] === 'assertive');
    expect(region?.textContent).toBe('Failed');
  });
});

// Review item 30: app helpers live only in @focsd-dev/primitives/utils, not on the root.
describe('the root entry', () => {
  it('exports none of the app helpers', () => {
    const leaked = exportsOf(
      '@focsd-dev/primitives',
      `const names = ["en", "registerTranslation", "systemIconNames", "registerIconLibrary", "unregisterIconLibrary", "setDefaultIconLibrary", "setSystemIcons", "resetSystemIcons", "fromLucide", "fromFontAwesome", "fromSvgStrings", "deepActiveElement", "minorUnits", "parseISODate", "toISODate", "formatBytes", "acceptsFile"]; const found = names.filter((n) => n in m); if (found.length) throw new Error(found.join(', '))`,
    );

    expect(leaked.length).toBeGreaterThan(0);
  });
});
