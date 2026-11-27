// API metadata gates (quality B10): documented members (Q8), union-typed enum properties (Q9),
// documented CSS knobs (Q11) and the custom property naming rule (OD3, docs/custom-properties.md).
// Today's gaps are listed in api-docs.legacy.json, which only shrinks (B14 backfills it): anything
// new must follow the rules, and anything fixed must leave the list.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { againstLegacy, apiDocGaps, customElements, enumLikeStrings, undocumentedCssProperties } from '../../../scripts/lib/api-docs.mjs';
import { customPropertyViolations, isAllowedCustomProperty } from '../../../scripts/lib/custom-properties.mjs';
import { focsdManifest } from '../../../custom-elements-manifest.config.mjs';

const root = new URL('../../../', import.meta.url).pathname;
const cem = new URL('../node_modules/.bin/cem', import.meta.url).pathname;
const scratch = mkdtempSync(join(tmpdir(), 'focsd-api-docs-'));

afterAll(() => rmSync(scratch, { recursive: true, force: true }));

/** @param {string} path */
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

/** The sibling packages build after components, so analyze their sources here (as events.test.mjs). */
function analyze(/** @type {string} */ pkg) {
  const outdir = join(scratch, pkg);

  execFileSync(cem, ['analyze', '--globs', `packages/${pkg}/src/**/*.js`, '--litelement', '--outdir', relative(root, outdir)], {
    cwd: root,
    stdio: 'pipe',
  });

  return readJson(join(outdir, 'custom-elements.json'));
}

/** @param {string[]} dirs package source directories, relative to packages/ */
const sources = (dirs) =>
  dirs.flatMap((dir) =>
    readdirSync(join(root, 'packages', dir), { recursive: true, encoding: 'utf8' })
      .filter((f) => f.endsWith('.js'))
      .map((f) => readFileSync(join(root, 'packages', dir, f), 'utf8')),
  );

const PACKAGES = {
  components: {
    manifest: readJson(new URL('../custom-elements.json', import.meta.url).pathname),
    dirs: ['components/src', 'primitives/src'],
  },
  'data-grid': { manifest: analyze('data-grid'), dirs: ['data-grid/src'] },
  charts: { manifest: analyze('charts'), dirs: ['charts/src'] },
  editor: { manifest: analyze('editor'), dirs: ['editor/src'] },
};

const NAMES = /** @type {(keyof typeof PACKAGES)[]} */ (Object.keys(PACKAGES));
const LEGACY = readJson(new URL('./api-docs.legacy.json', import.meta.url).pathname);

/**
 * @param {string[]} found
 * @param {string[]} legacy
 */
function expectWithinLegacy(found, legacy) {
  const { added, fixed } = againstLegacy(found, legacy);

  expect(added, 'new gaps: document them (the legacy list only shrinks)').toEqual([]);
  expect(fixed, 'fixed: remove them from api-docs.legacy.json').toEqual([]);
}

const tiny = {
  modules: [
    {
      declarations: [
        { name: 'XBase', description: 'Headless x.', members: [] },
        {
          name: 'X',
          tagName: 'focsd-x',
          customElement: true,
          superclass: { name: 'XBase' },
          attributes: [{ name: 'tone', fieldName: 'tone', description: 'Color.' }, { name: 'size' }],
          members: [
            { kind: 'field', name: 'tone', attribute: 'tone', type: { text: 'string' }, default: "'neutral'" },
            { kind: 'field', name: 'label', type: { text: 'string' }, default: "''" },
            { kind: 'field', name: 'mode', type: { text: "'a' | 'b'" }, default: "'a'" },
            { kind: 'method', name: 'show', inheritedFrom: { name: 'XBase' } },
            { kind: 'method', name: 'render' },
            { kind: 'field', name: '_state', privacy: 'private' },
          ],
          cssProperties: [{ name: '--focsd-x-gap' }],
        },
      ],
    },
  ],
};

describe('the checks', () => {
  it('inherits a base description onto an element without one', () => {
    const manifest = structuredClone(tiny);

    expect(apiDocGaps(manifest)).toEqual(['<focsd-x>', 'X.label', 'X.mode', 'XBase.show', 'X[size]']);
    focsdManifest().packageLinkPhase({ customElementsManifest: manifest });
    expect(customElements(manifest)[0].description).toBe('Headless x.');
    expect(apiDocGaps(manifest)).not.toContain('<focsd-x>');
  });

  it('flags keyword defaults typed as string, not free text or unions', () => {
    expect(enumLikeStrings(tiny)).toEqual(['X.tone']);
  });

  it('flags a component knob read but not documented', () => {
    const css = 'a { gap: var(--focsd-x-gap); padding: var(--focsd-x-pad, 0); color: var(--focsd-ink); inset: var(--focsd-x-${i}) }';

    expect(undocumentedCssProperties(tiny, [css])).toEqual(['--focsd-x-pad']);
  });

  it('flags a component knob declared in the styles but not documented (a runtime-built read is not enough)', () => {
    const css = ':host { --focsd-x-1: var(--focsd-ink); --focsd-x-gap: 0; --_private: 1 } a { fill: var(--focsd-x-${i}) }';

    expect(undocumentedCssProperties(tiny, [css])).toEqual(['--focsd-x-1']);
  });

  it('accepts tokens, --focsd-<tag>-* knobs and runtime-built names of either', () => {
    const known = { tags: ['x', 'data-grid'], tokens: ['ink', 'space-3', 'duration-base'] };

    expect(
      ['--focsd-ink', '--focsd-x-gap', '--focsd-data-grid-max', '--focsd-space-', '--focsd-x-'].every((n) =>
        isAllowedCustomProperty(n, known),
      ),
    ).toBe(true);
    expect(customPropertyViolations(['--focsd-sheet-z: 1; var(--focsd-grid-row); var(--focsd-y-${n}); --_private: 0'], known)).toEqual([
      '--focsd-grid-row',
      '--focsd-sheet-z',
      '--focsd-y-',
    ]);
  });

  it('matches a knob to its own element exactly, not to a shorter tag it happens to start with (B14)', () => {
    const known = {
      tags: ['tab', 'tabs', 'x'],
      tokens: ['ink'],
      documented: { tab: ['--focsd-tab-indicator'], tabs: ['--focsd-tabs-gap'], x: [] },
    };

    // `--focsd-tabs-list-gap` starts with `tab` + `s`, never `tab-`; `--focsd-tab-list-gap` is not one of focsd-tab's knobs.
    expect(
      customPropertyViolations(['var(--focsd-tab-indicator) var(--focsd-tabs-gap) var(--focsd-tab-list-gap) var(--focsd-x-pad)'], known),
    ).toEqual(['--focsd-tab-list-gap', '--focsd-x-pad']);
  });
});

describe('the analyzer plugin', () => {
  it('drops Lit state (`state: true`) and `_` fields from the manifest attributes', () => {
    const manifest = {
      modules: [
        {
          declarations: [
            {
              name: 'Y',
              tagName: 'focsd-y',
              customElement: true,
              attributes: [
                { name: '_open', fieldName: '_open' },
                { name: 'busy', fieldName: 'busy' },
                { name: 'label', fieldName: 'label' },
              ],
              members: [
                { kind: 'field', name: '_open', attribute: '_open' },
                { kind: 'field', name: 'busy', attribute: 'busy' },
                { kind: 'field', name: 'label', attribute: 'label' },
              ],
            },
            {
              name: 'Z',
              tagName: 'focsd-z',
              customElement: true,
              attributes: [{ name: 'busy', fieldName: 'busy', inheritedFrom: { name: 'Y' } }],
              members: [{ kind: 'field', name: 'busy', attribute: 'busy', inheritedFrom: { name: 'Y' } }],
            },
          ],
        },
      ],
    };

    const plugin = focsdManifest();

    plugin.stateFields.add('Y.busy');
    plugin.packageLinkPhase({ customElementsManifest: manifest });
    const [y, z] = customElements(manifest);

    expect(y.attributes.map((a) => a.name)).toEqual(['label']);
    expect(z.attributes).toEqual([]);
    expect(y.members.filter((m) => m.attribute).map((m) => m.name)).toEqual(['label']);
  });
});

describe('shared Tone and Placement types (B14 m1)', () => {
  const read = (/** @type {string} */ path) => readFileSync(join(root, 'packages/primitives/src', path), 'utf8');

  it('the analyzer plugin writes a shared type out as its union', () => {
    const manifest = {
      modules: [
        {
          declarations: [
            {
              name: 'W',
              tagName: 'focsd-w',
              customElement: true,
              attributes: [{ name: 'tone', fieldName: 'tone', type: { text: 'Tone' } }],
              members: [
                { kind: 'field', name: 'tone', attribute: 'tone', type: { text: 'Tone' } },
                { kind: 'field', name: 'placement', type: { text: 'BlockPlacement' } },
                { kind: 'field', name: 'side', type: { text: 'Placement | undefined' } },
              ],
            },
          ],
        },
      ],
    };

    focsdManifest().packageLinkPhase({ customElementsManifest: manifest });
    const [w] = customElements(manifest);
    const tone = "'neutral' | 'info' | 'positive' | 'caution' | 'critical'";

    expect(w.attributes[0].type.text).toBe(tone);
    expect(w.members.map((m) => m.type.text)).toEqual([tone, "'top' | 'bottom'", 'Placement | undefined']);
  });

  it('no base writes the tone or placement union inline', () => {
    const inline = [
      ['display/alert-base.js', /'neutral' \| 'info'/],
      ['display/badge-base.js', /'neutral' \| 'info'/],
      ['display/tag-base.js', /'neutral' \| 'info'/],
      ['data/timeline-item-base.js', /'neutral' \| 'info'/],
      ['overlays/popover-base.js', /'top' \| 'bottom'/],
      ['overlays/tooltip-base.js', /'top' \| 'bottom'/],
      ['overlays/hover-card-base.js', /'top' \| 'bottom'/],
      ['overlays/toggletip-base.js', /'top' \| 'bottom'/],
      ['overlays/tour-base.js', /'top' \| 'bottom'/],
      ['internal/place.js', /'top' \| 'bottom'/],
    ].filter(([path, pattern]) => /** @type {RegExp} */ (pattern).test(read(/** @type {string} */ (path))));

    expect(inline.map(([path]) => path)).toEqual([]);
  });

  it('the built manifest shows the union for focsd-badge tone', () => {
    const badge = customElements(PACKAGES.components.manifest).find((d) => d.tagName === 'focsd-badge');

    expect(badge?.attributes.find((a) => a.name === 'tone')?.type?.text).toBe("'neutral' | 'info' | 'positive' | 'caution' | 'critical'");
  });
});

describe.each(NAMES)('%s', (name) => {
  const { manifest, dirs } = PACKAGES[name];

  it('documents every element, attribute and public member (Q8)', () => {
    expectWithinLegacy(apiDocGaps(manifest), LEGACY.docs[name]);
  });

  it('types enum-like properties as unions (Q9)', () => {
    expectWithinLegacy(enumLikeStrings(manifest), LEGACY.enums[name]);
  });

  it('documents every --focsd-<tag>-* knob it reads with @cssprop (Q11)', () => {
    expectWithinLegacy(undocumentedCssProperties(manifest, sources(dirs)), LEGACY.cssProperties[name]);
  });
});

describe('Lit state stays out of the manifest', () => {
  it.each(NAMES)('%s has no `state: true` or `_` attribute', (name) => {
    const leaked = customElements(PACKAGES[name].manifest).flatMap((d) =>
      (d.attributes ?? []).filter((a) => a.name.startsWith('_')).map((a) => `${d.name}[${a.name}]`),
    );

    expect(leaked).toEqual([]);
  });
});

describe('custom property names (OD3)', () => {
  it('every --focsd-* name is a token or --focsd-<tag>-*; private ones are --_*', async () => {
    const { tokenNames } = await import('@focsd/tokens');
    const decls = NAMES.flatMap((n) => customElements(PACKAGES[n].manifest));
    const tags = decls.map((d) => String(d.tagName).replace(/^focsd-/, ''));
    // Exact (B14): a knob counts only when the element it is named after documents it with @cssprop.
    const documented = Object.fromEntries(decls.map((d, i) => [tags[i], (d.cssProperties ?? []).map((p) => p.name)]));
    const dirs = NAMES.flatMap((n) => PACKAGES[n].dirs);

    expectWithinLegacy(customPropertyViolations(sources(dirs), { tags, tokens: [...tokenNames], documented }), LEGACY.names);
  });
});

/** Every described attribute and member of an element, by `[attr]` and `.member`. */
const descriptions = (/** @type {import('../../../scripts/lib/api-docs.mjs').Declaration} */ decl) =>
  new Map([
    ...(decl.attributes ?? []).map((a) => /** @type {[string, string]} */ ([`[${a.name}]`, a.description ?? ''])),
    ...(decl.members ?? []).map((m) => /** @type {[string, string]} */ ([`.${m.name}`, m.description ?? ''])),
  ]);

const element = (/** @type {string} */ tag) => {
  const decl = customElements(PACKAGES.components.manifest).find((d) => d.tagName === tag);

  if (!decl) throw new Error(`no ${tag} in the manifest`);

  return descriptions(decl);
};

describe('the wave 14 API is described (final review I1, M1)', () => {
  const MESSAGE_API = ['[label-position]', '[hint]', '[warning]', '[success]', '.labelPosition', '.hint', '.warning', '.success'];

  it('every form control describes label-position, hint, warning and success', () => {
    const controls = customElements(PACKAGES.components.manifest).filter((d) =>
      (d.attributes ?? []).some((a) => a.name === 'label-position'),
    );

    const blank = controls.flatMap((d) => MESSAGE_API.flatMap((k) => (descriptions(d).get(k) ? [] : [`${d.tagName}${k}`])));

    expect(controls.length).toBeGreaterThan(22);
    expect(blank).toEqual([]);
  });

  it.each([
    ['focsd-split-button', ['label', 'open']],
    ['focsd-date-time-picker', ['label', 'value', 'min', 'max', 'locale']],
  ])('%s describes its inherited properties', (tag, names) => {
    const own = element(tag);

    expect(names.flatMap((n) => [`[${n}]`, `.${n}`]).filter((k) => !own.get(k))).toEqual([]);
  });

  it.each(NAMES)('%s: no plan ruling numbers in public descriptions', (name) => {
    const jargon = /\bRuling\b|\bR\d{1,2}\b/;

    const leaks = customElements(PACKAGES[name].manifest).flatMap((d) => [
      ...(jargon.test(d.description ?? '') ? [d.tagName] : []),
      ...[...descriptions(d)].flatMap(([k, text]) => (jargon.test(text) ? [`${d.tagName}${k}`] : [])),
    ]);

    expect(leaks).toEqual([]);
  });
});
