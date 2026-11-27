import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { breakingPackages, diffApi, diffExports, extractApi, resolvedMembers, run } from '../api-compat.mjs';

/** A one-element manifest; `over` replaces fields of the element declaration. */
const cem = (over = {}) => ({
  modules: [
    {
      declarations: [
        {
          customElement: true,
          tagName: 'x-box',
          attributes: [
            { name: 'size', type: { text: "'s' | 'm' | 'l'" } },
            { name: 'label', type: { text: 'string' } },
          ],
          members: [
            { kind: 'field', name: 'size', privacy: 'public', type: { text: "'s' | 'm' | 'l'" } },
            { kind: 'field', name: '#secret', privacy: 'private' },
            { kind: 'method', name: 'open', privacy: 'public' },
            { kind: 'method', name: 'internal', privacy: 'protected' },
          ],
          events: [{ name: 'change' }],
          slots: [{ name: '' }, { name: 'icon' }],
          cssParts: [{ name: 'control' }],
          cssProperties: [{ name: '--x-gap' }],
          ...over,
        },
      ],
    },
  ],
});

const problems = (over) => diffApi(extractApi(cem()), extractApi(cem(over)));

describe('extractApi', () => {
  it('lists public API per tag and skips private members', () => {
    const api = extractApi(cem());

    assert.deepEqual(Object.keys(api), ['x-box']);
    assert.deepEqual(Object.keys(api['x-box'].methods), ['open']);
    assert.deepEqual(Object.keys(api['x-box'].properties), ['size']);
    assert.deepEqual(Object.keys(api['x-box'].slots).toSorted(), ['', 'icon']);
  });
});

describe('diffApi', () => {
  it('passes an unchanged API and additions', () => {
    assert.deepEqual(problems({}), []);
    assert.deepEqual(problems({ events: [{ name: 'change' }, { name: 'extra' }] }), []);
    assert.deepEqual(
      problems({ attributes: [{ name: 'size', type: { text: "'s' | 'm' | 'l' | 'xl'" } }, { name: 'label' }, { name: 'tone' }] }),
      [],
    );
  });

  it('flags each kind of removal', () => {
    assert.match(problems({ attributes: [{ name: 'size', type: { text: "'s' | 'm' | 'l'" } }] }).join(), /attribute `label`/);
    assert.match(problems({ events: [] }).join(), /event `change`/);
    assert.match(problems({ slots: [{ name: '' }] }).join(), /slot `icon`/);
    assert.match(problems({ cssParts: [] }).join(), /part `control`/);
    assert.match(problems({ cssProperties: [] }).join(), /CSS property `--x-gap`/);
    assert.match(problems({ members: [] }).join(), /method `open`/);
    assert.match(problems({ members: [] }).join(), /property `size`/);
  });

  it('flags a removed element', () => {
    assert.match(diffApi(extractApi(cem()), {}).join(), /element `x-box` was removed/);
  });

  it('flags a narrowed type union but not a widened one', () => {
    const narrowed = problems({
      attributes: [
        { name: 'size', type: { text: "'s' | 'm'" } },
        { name: 'label', type: { text: 'string' } },
      ],
    });

    assert.match(narrowed.join(), /`size` no longer accepts 'l'/);
  });

  it('flags a newly required attribute', () => {
    const required = problems({
      attributes: [{ name: 'size', type: { text: "'s' | 'm' | 'l'" } }, { name: 'label' }, { name: 'id', required: true }],
    });

    assert.match(required.join(), /attribute `id` is now required/);
  });
});

describe('run', () => {
  const setup = (changeset) => {
    const root = mkdtempSync(join(tmpdir(), 'api-compat-'));

    mkdirSync(join(root, 'packages/box'), { recursive: true });
    mkdirSync(join(root, 'api'));
    mkdirSync(join(root, '.changeset'));
    writeFileSync(join(root, 'packages/box/package.json'), JSON.stringify({ name: '@x/box', version: '1.0.0' }));
    writeFileSync(join(root, 'packages/box/custom-elements.json'), JSON.stringify(cem({ events: [] })));

    if (changeset) writeFileSync(join(root, '.changeset/c.md'), changeset);

    return root;
  };

  it('passes with an api/ folder that has no baseline for the package', () => {
    const result = run(setup());

    assert.equal(result.code, 0);
    assert.match(result.lines.join(), /0 package\(s\) compared/);
  });

  it('fails a break without a Breaking changeset line', () => {
    const root = setup("---\n'@x/box': minor\n---\n\nAdd things.\n");

    writeFileSync(join(root, 'api/box.cem.json'), JSON.stringify(cem()));
    const result = run(root);

    assert.equal(result.code, 1);
    assert.match(result.lines.join(), /event `change`/);
  });

  it('passes a break that a changeset marks Breaking', () => {
    const root = setup("---\n'@x/box': major\n---\n\n**Breaking** the change event is gone.\n");

    writeFileSync(join(root, 'api/box.cem.json'), JSON.stringify(cem()));

    assert.equal(run(root).code, 0);
  });

  it('reads the Breaking line only for the packages the changeset names', () => {
    const root = setup("---\n'@x/other': major\n---\n\n**Breaking** elsewhere.\n");

    assert.deepEqual([...breakingPackages(root)], ['@x/other']);
  });
});

/** A baseline file as api-baseline.mjs writes it. */
const baseline = (version, manifest = cem()) => JSON.stringify({ name: '@x/box', version, manifest });

describe('wave 20 review fixes: run', () => {
  const setup = () => {
    const root = mkdtempSync(join(tmpdir(), 'api-compat-fix-'));

    mkdirSync(join(root, 'packages/box'), { recursive: true });
    mkdirSync(join(root, '.changeset'));
    writeFileSync(join(root, 'packages/box/package.json'), JSON.stringify({ name: '@x/box', version: '1.0.0' }));

    return root;
  };

  it('fails when a baseline exists but the manifest is missing (I6)', () => {
    const root = setup();

    mkdirSync(join(root, 'api'));
    writeFileSync(join(root, 'api/box.cem.json'), baseline('1.0.0'));
    const result = run(root);

    assert.equal(result.code, 1);
    assert.match(result.lines.join('\n'), /packages\/box\/custom-elements\.json is missing: run `pnpm build` first/);
  });

  it('is inactive only without an api/ folder', () => {
    const root = setup();

    writeFileSync(join(root, 'packages/box/custom-elements.json'), JSON.stringify(cem()));

    assert.match(run(root).lines.join(), /inactive \(no api\/ baseline folder\)/);
  });

  it('compares a baseline at the same version and fails a break (I7)', () => {
    const root = setup();

    mkdirSync(join(root, 'api'));
    writeFileSync(join(root, 'api/box.cem.json'), baseline('1.0.0'));
    writeFileSync(join(root, 'packages/box/custom-elements.json'), JSON.stringify(cem({ events: [] })));

    assert.equal(run(root).code, 1);
  });

  it('skips a package whose version moved past the baseline (after changeset version) (I7)', () => {
    const root = setup();

    mkdirSync(join(root, 'api'));
    writeFileSync(join(root, 'api/box.cem.json'), baseline('0.9.3'));
    writeFileSync(join(root, 'packages/box/custom-elements.json'), JSON.stringify(cem({ events: [] })));
    const result = run(root);

    assert.equal(result.code, 0);
    assert.match(result.lines.join('\n'), /@x\/box: skipped, version 1\.0\.0 is past the baseline 0\.9\.3/);
  });

  it('accepts a legacy baseline that is a bare manifest (no version)', () => {
    const root = setup();

    mkdirSync(join(root, 'api'));
    writeFileSync(join(root, 'api/box.cem.json'), JSON.stringify(cem()));
    writeFileSync(join(root, 'packages/box/custom-elements.json'), JSON.stringify(cem({ events: [] })));

    assert.equal(run(root).code, 1);
  });
});

describe('wave 20 review fixes: false positives (minor 23)', () => {
  it('passes widening a literal union to string, any or unknown', () => {
    for (const text of ['string', 'any', 'unknown', 'string | undefined']) {
      assert.deepEqual(
        problems({
          attributes: [
            { name: 'size', type: { text } },
            { name: 'label', type: { text: 'string' } },
          ],
        }),
        [],
        text,
      );
    }
  });

  it('passes a union replaced by a named type alias it cannot resolve', () => {
    assert.deepEqual(
      problems({
        attributes: [
          { name: 'size', type: { text: 'Size' } },
          { name: 'label', type: { text: 'string' } },
        ],
      }),
      [],
    );
  });

  it('ignores _-prefixed members', () => {
    const before = cem({
      members: [
        { kind: 'field', name: '_state', privacy: 'public' },
        { kind: 'method', name: '_go' },
      ],
    });

    assert.deepEqual(diffApi(extractApi(before), extractApi(cem({ members: [] }))), []);
  });
});

describe('review item 131: aliases, exports and major bumps', () => {
  it('resolves a type alias to its members', () => {
    const aliases = { Size: "'s' | 'm' | Big", Big: "'l' | 'xl'" };

    assert.deepEqual(resolvedMembers('Size | null', aliases), ["'s'", "'m'", "'l'", "'xl'"]);
  });

  it('finds a union narrowed through an alias', () => {
    const element = (text) => ({
      attributes: { size: { name: 'size', type: { text } } },
      properties: {},
      methods: {},
      events: {},
      slots: {},
      parts: {},
      cssProperties: {},
    });

    const narrowed = diffApi(
      { 'x-a': element('Size') },
      { 'x-a': element('Size') },
      { before: { Size: "'s' | 'm'" }, after: { Size: "'s'" } },
    );

    assert.deepEqual(narrowed, ["x-a: attribute `size` no longer accepts 'm'"]);
  });

  it('finds removed exports and entry points', () => {
    assert.deepEqual(diffExports({ './utils': ['announce', 'setLocale'], './old': ['x'] }, { './utils': ['announce'] }), [
      '`./utils` no longer exports `setLocale`',
      'entry point `./old` was removed',
    ]);
  });

  it('does not accept a Breaking line in a minor changeset', () => {
    const root = mkdtempSync(join(tmpdir(), 'api-compat-minor-'));

    mkdirSync(join(root, '.changeset'));
    writeFileSync(join(root, '.changeset/c.md'), "---\n'@x/box': minor\n---\n\n**Breaking** the change event is gone.\n");
    assert.deepEqual([...breakingPackages(root)], []);
  });
});
