import { afterEach, describe, expect, test } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { orphanTypings, stripInternalMembers, typingsProblems, underscoreMembers } from '../../../scripts/lib/typings.mjs';

const packageDir = new URL('../', import.meta.url).pathname;

/** @type {string[]} */
const fixtures = [];

/** @param {Record<string, string>} files */
function fixture(files) {
  const dir = mkdtempSync(join(tmpdir(), 'focsd-typings-'));

  fixtures.push(dir);

  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }

  return dir;
}

afterEach(() => {
  for (const dir of fixtures.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('underscoreMembers', () => {
  test('counts typed, untyped, private and protected `_x` members and public `ids` fields', () => {
    const dir = fixture({
      'types/a.d.ts': [
        'export declare class A {',
        '    _a;',
        '    _b: number;',
        '    private _c;',
        '    protected _d(): void;',
        '    get _e(): string;',
        '    ids: {',
        '        x: string;',
        '    };',
        '    label: string;',
        '}',
        '',
      ].join('\n'),
    });

    expect(underscoreMembers(dir)).toEqual({ 'types/a.d.ts': 6 });
  });

  test('does not count an `ids` key of an exported object type (an event detail is data, not state)', () => {
    const dir = fixture({
      'types/a.d.ts': [
        'export type SelectionChangeDetail = {',
        '    ids: unknown[];',
        '};',
        'export declare class A {',
        '    ids: string[];',
        '}',
        '',
      ].join('\n'),
    });

    expect(underscoreMembers(dir)).toEqual({ 'types/a.d.ts': 1 });
  });
});

describe('typingsProblems', () => {
  test('advises @internal for `_name` members and private for `ids` fields', () => {
    const dir = fixture({
      'src/a.js': '',
      'src/b.js': '',
      'types/a.d.ts': 'export declare class A {\n    _open: boolean;\n}\n',
      'types/b.d.ts': 'export declare class B {\n    ids: {\n        x: string;\n    };\n}\n',
    });

    expect(typingsProblems(dir)).toEqual([
      'types/a.d.ts declares 1 internal-looking member (allowed: 0): tag `_name` members @internal',
      'types/b.d.ts declares 1 internal-looking member (allowed: 0): make `ids` fields private',
    ]);
  });
});

describe('orphanTypings', () => {
  test('flags declarations whose source module is gone (stale pre-rename typings)', () => {
    const dir = fixture({
      'src/focsd-button.js': '',
      'src/styles/field.js': '',
      'src/mixins/host.ts': '',
      'types/focsd-button.d.ts': '',
      'types/styles/field.d.ts': '',
      'types/mixins/host.d.ts': '',
      'types/opn-button.d.ts': '',
      'types/styles/ub-old.d.ts': '',
    });

    expect(orphanTypings(dir)).toEqual(['types/opn-button.d.ts', 'types/styles/ub-old.d.ts']);
  });

  test('keeps the generated integration typings', () => {
    const dir = fixture(Object.fromEntries(['elements', 'jsx', 'react', 'svelte', 'vue'].map((name) => [`types/${name}.d.ts`, ''])));

    expect(orphanTypings(dir)).toEqual([]);
  });

  test('a package without types has nothing to flag', () => {
    expect(orphanTypings(fixture({ 'src/index.js': '' }))).toEqual([]);
  });
});

describe('stripInternalMembers', () => {
  const cls = (...members) => ['export declare class A {', ...members, '    pub: string;', '    other: number;', '}', ''].join('\n');
  const kept = cls();

  test('removes an @internal comment and the single-line member after it; public members survive', () => {
    const source = cls(
      '    /** @internal */',
      '    _open: boolean;',
      '    /**',
      '     * Live-region text.',
      '     * @internal',
      '     */',
      '    readonly _label?: string | null;',
      '    /** @internal */',
      '    _rows: Array<Row>;',
    );

    expect(stripInternalMembers(source, 'types/a.d.ts')).toBe(kept);
  });

  test.each([
    ['a trailing comment with a bracket (reviewer case)', ['    /** @internal */', '    _a: number; // see {']],
    ['a quoted bracket type', ['    /** @internal */', '    _s: "{";']],
    ['a multi-line object type', ['    /** @internal */', '    _o: {', '        a: number;', '    };']],
    ['a method', ['    /** @internal */', '    _m(): void;']],
    ['an array type with brackets', ['    /** @internal */', '    _rows: Row[];']],
    ['a declaration on the comment line', ['    /** @internal */ _x: number;']],
    ['a public member', ['    /** @internal */', '    open: boolean;']],
  ])('throws with file:line and deletes nothing for %s', (_name, members) => {
    expect(() => stripInternalMembers(cls(...members), 'types/a.d.ts')).toThrow(/^types\/a\.d\.ts:\d+: /);
  });

  test('throws on an unterminated doc comment or @internal at the end of the file', () => {
    expect(() => stripInternalMembers('/** @internal\n_x: number;', 'types/b.d.ts')).toThrow(/^types\/b\.d\.ts:1: /);
    expect(() => stripInternalMembers('class A {\n/** @internal */', 'types/c.d.ts')).toThrow(/^types\/c\.d\.ts:2: /);
  });

  // Round-3 re-review probes: each must throw, or keep every public member.
  const probe = (...members) => ['export declare class A {', ...members, '    pub: string;', '}', ''].join('\n');
  const probeKept = probe();

  test.each([
    ['a tag after code on its line', probe('    pub0: string; /** @internal */', '    _x: number;')],
    ['a tag after a public doc comment and member', probe('    /** Public. */ pub0: string; /** @internal */', '    _x: number;')],
    ['a comment whose closing line holds code', probe('    /**', '     * @internal', '     */ pub0: string; /** y */', '    _x: number;')],
    [
      'a nested comment mentioning the tag',
      probe('    /**', '     * Public thing. Do not mark /** @internal */ here.', '     */', '    _compat: number;'),
    ],
    ['a top-level declaration', '/** @internal */\nexport declare const _x: number;\n'],
    ['a tag mentioned in prose, not as a tag', probe('    /** see @internal notes */', '    _legacy: number;')],
    ['a public member after ; on the member line', probe('    /** @internal */', '    _x: number; pub0: string;')],
    ['a static public member after ;', probe('    /** @internal */', '    _x: number; static pub0: number;')],
    ['a setter after ;', probe('    /** @internal */', '    _x: A; set pub0: B;')],
    ['a doubled ;', probe('    /** @internal */', '    _x: number;;')],
    ['a second comment before the member', probe('    /** @internal */', '    /** pub doc */', '    pub0: string;')],
    ['two comments on the tag line', probe('    /** @internal */ /** pub */', '    _x: number;')],
    ['mixed line endings', probe('    /** @internal */', '    _x: number;').replace('\n', '\r\n')],
  ])('throws with file:line for %s', (_name, source) => {
    expect(() => stripInternalMembers(source, 'f.d.ts')).toThrow(/^f\.d\.ts:\d+: /);
  });

  test.each([
    [
      'an interface member',
      'interface I {\n    /** @internal */\n    _x: number;\n    pub: string;\n}\n',
      'interface I {\n    pub: string;\n}\n',
    ],
    ['tab indentation', probe('\t/** @internal */', '\t_x: number;'), probeKept],
    ['two consecutive members', probe('    /** @internal */', '    _a: number;', '    /** @internal */', '    _b: number;'), probeKept],
    [
      'a CRLF file, written back as CRLF',
      probe('    /** @internal */', '    _x: number;').replaceAll('\n', '\r\n'),
      probeKept.replaceAll('\n', '\r\n'),
    ],
  ])('strips only the internal member for %s', (_name, source, expected) => {
    expect(stripInternalMembers(source, 'f.d.ts')).toBe(expected);
  });

  // Round-4 re-review probes (scratchpad b2rev4/probe4.mjs): each must throw, or keep every public member.
  const I = '    /** @internal */';
  const noTrailing = `export declare class A {\n${I}\n    _x: number;\n}`;

  test.each([
    ['*/ inside a string type', probe(I, '    _x: "a */ b";')],
    ['a bare */ in the type', probe(I, '    _x: a */ b;')],
    ['the tag inside a code span', probe('    /** Use `@internal` for this. */', '    _x: number;')],
    ['a code span starting a comment line', probe('    /**', '     * `@internal` is how', '     */', '    _x: number;')],
    ['a member continued on the next line', probe(I, '    _x: A |', '        B;')],
    ['a non-ASCII member name', probe(I, '    _ñ: number;')],
    ['a non-ASCII type', probe(I, '    _x: Ñ;')],
    ['a bare @internal file', '@internal'],
    ['a comma then a public interface member', `export interface I {\n${I}\n    _x: number, pub0: string;\n    pub: string;\n}\n`],
    ['a comma then a public type-literal member', `export type T = {\n${I}\n    _x: number, pub0: string;\n};\n`],
    ['U+2028 inside the member line', probe(I, '    _x: number\u2028    pub0: string;')],
    ['U+2029 inside the member line', probe(I, '    _x: number\u2029    pub0: string;')],
    ['a multi-line template literal type', `export type T = \`a\n${I}\n    _x: number;\nb\`;\n`],
    ['a tag inside a plain block comment', probe('    /* plain block comment opens', I, '    _x: number;')],
    ['a plain block comment around an untagged member', probe('    /* note:', I, '    _real: number;', '    */')],
    ['a comma in a generic type', probe(I, '    _x: Map<string, number>;')],
    ['a conditional type', probe(I, '    _x: A extends B ? C : D;')],
    ['no-break-space indentation', probe('\u00a0\u00a0/** @internal */', '\u00a0\u00a0_x: number;')],
    ['a bare CR', probe(I, '    _x: number;').replace('\n', '\r')],
    ['an unterminated tagged comment', probe('    /** @internal', '    _x: number;')],
    ['@internalized', probe('    /** @internalized */', '    _x: number;')],
    ['@internal-ish', probe('    /** @internal-ish */', '    _x: number;')],
    ['a backtick in a string type', probe(I, '    _x: number;', '    pub0: "a`b";')],
    ['a backtick in a line comment', probe(I, '    _x: number;', '    pub0: string; // `x`')],
    ['a string continued on the next line', probe('    pub0: "a\\', I, '    _x: number;";')],
  ])('throws with file:line for %s', (_name, source) => {
    expect(() => stripInternalMembers(source, 'f.d.ts')).toThrow(/^f\.d\.ts:\d+: /);
  });

  test.each([
    ['a tag followed by text', probe('    /** @internal Not public, see below. */', '    _x: number;'), probeKept],
    ['a tag plus @param', probe('    /**', '     * @internal', '     * @param x thing', '     */', '    _x: number;'), probeKept],
    ['a stray line after the member', probe(I, '    _x: A;', '        | B;'), probe('        | B;')],
    ['a non-ASCII public member after it', probe(I, '    _x: number;', '    ñ: string;'), probe('    ñ: string;')],
    ['no trailing newline', noTrailing, 'export declare class A {\n}'],
    ['the member on the last line', `export declare class A {\n${I}\n    _x: number;`, 'export declare class A {'],
    ['CRLF with no trailing newline', noTrailing.replaceAll('\n', '\r\n'), 'export declare class A {\r\n}'],
    ['a comment closed on its own line', probe('    /** @internal', '     */', '    _x: number;'), probeKept],
    [
      'a public member before the tag',
      probe('    /**', '     * Pub.', '     */', '    pub0: string;', I, '    _x: number;'),
      probe('    /**', '     * Pub.', '     */', '    pub0: string;'),
    ],
    ['a byte-order mark', `\ufeff${probe(I, '    _x: number;')}`, `\ufeff${probeKept}`],
    [
      'code spans in doc comments (the real emit)',
      [
        '/** Set `items`. */',
        'export declare class A {',
        '    /** Scroll to `index`. */',
        '    scroll(): void;',
        I,
        '    _x: number;',
        '}',
        '',
      ].join('\n'),
      ['/** Set `items`. */', 'export declare class A {', '    /** Scroll to `index`. */', '    scroll(): void;', '}', ''].join('\n'),
    ],
  ])('strips only the internal member for %s', (_name, source, expected) => {
    expect(stripInternalMembers(source, 'f.d.ts')).toBe(expected);
  });

  test('an empty file is returned unchanged', () => {
    expect(stripInternalMembers('', 'f.d.ts')).toBe('');
  });

  test.each([
    ['a template literal type', ['export type T = `a${string}`;', I, '    _x: number;'], 1],
    ['U+2028', ['export declare const a: number;', '    _y: 1;\u2028', I, '    _x: number;'], 2],
    ['a plain block comment', ['export declare const a: number;', 'export declare const b: number;', '/* c */', I, '    _x: number;'], 3],
  ])('names the line of the offending character for %s', (_name, lines, line) => {
    expect(() => stripInternalMembers(lines.join('\n'), 'f.d.ts')).toThrow(new RegExp(`^f\\.d\\.ts:${line}: `));
  });

  test('a CRLF file without @internal is returned unchanged', () => {
    const source = 'export declare const a: number;\r\n';

    expect(stripInternalMembers(source, 'f.d.ts')).toBe(source);
  });

  test('leaves a file without @internal unchanged', () => {
    const source = 'export declare const a: number;\n';

    expect(stripInternalMembers(source)).toBe(source);
  });
});

test('emit-types refuses to run, and deletes nothing, outside a package with tsconfig.types.json', () => {
  const dir = fixture({ 'types/keep.d.ts': '' });
  const script = new URL('../../../scripts/emit-types.mjs', import.meta.url).pathname;
  const run = spawnSync(process.execPath, [script], { cwd: dir, encoding: 'utf8' });

  expect(run.status).toBe(1);
  expect(run.stderr).toMatch(/tsconfig\.types\.json not found/);
  expect(existsSync(join(dir, 'types/keep.d.ts'))).toBe(true);
});

test('the built typings are clean: no stale file, no internal member', () => {
  expect(typingsProblems(packageDir)).toEqual([]);
});
