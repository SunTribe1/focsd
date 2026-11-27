import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkRepository, findVisibleStrings } from '../visible-strings.mjs';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

describe('findVisibleStrings', () => {
  it('flags literal text nodes and the four visible attributes (RED proof)', () => {
    const found = findVisibleStrings(fixture('visible-strings-bad.js.txt'));
    const texts = found.map((finding) => finding.text);

    assert.deepEqual(texts, [
      'Save changes',
      'aria-label="Search"',
      'placeholder="Type here"',
      'title="Find"',
      'alt="A cat"',
      '${…} items',
      'Fine ${…}',
      'Second line of copy',
    ]);
  });

  it('reports the line of each finding', () => {
    const lines = findVisibleStrings(fixture('visible-strings-bad.js.txt')).map((finding) => finding.line);

    assert.deepEqual(lines, [3, 5, 5, 5, 5, 7, 11, 13]);
  });

  it('passes localized, symbol-only, svg and marked templates', () => {
    assert.deepEqual(findVisibleStrings(fixture('visible-strings-good.js.txt')), []);
  });

  it('does not accept a marker without a reason', () => {
    assert.equal(findVisibleStrings('// visible-string:\nexport const x = html`<b>Hello</b>`;').length, 1);
  });
});

describe('checkRepository', () => {
  it('fails on a bad file under a package and skips the allowed ones', () => {
    const base = `${mkdtempSync(join(tmpdir(), 'focsd-vs-'))}/`;

    for (const [dir, file] of [
      ['primitives/src', 'bad.js'],
      ['primitives/src/internal', 'localize.js'],
      ['ai/src', 'terms.js'],
    ]) {
      mkdirSync(`${base}packages/${dir}`, { recursive: true });
      writeFileSync(`${base}packages/${dir}/${file}`, fixture('visible-strings-bad.js.txt'));
    }

    for (const name of ['components', 'charts', 'data-grid', 'editor']) mkdirSync(`${base}packages/${name}/src`, { recursive: true });
    mkdirSync(`${base}packages/ai/src`, { recursive: true });

    const problems = checkRepository(base);

    assert.ok(problems.length > 0);
    assert.ok(problems.every((problem) => problem.startsWith('packages/primitives/src/bad.js:')));
  });

  it('passes on the real repository', () => {
    assert.deepEqual(checkRepository(), []);
  });
});

describe('findVisibleStrings (wave 20 review minors 19, 20)', () => {
  it('flags literals in holes, property bindings, unquoted values, more attributes, quoted > and setAttribute', () => {
    const found = findVisibleStrings(fixture('visible-strings-bad-holes.js.txt'));

    assert.deepEqual(
      found.map(({ line, text }) => `${line} ${text}`),
      [
        `3 aria-label=\${'Close'}`,
        `5 \${'Open'}`,
        `5 \${'Shut'}`,
        `7 .placeholder=\${'Search'}`,
        '7 .ariaLabel="Menu"',
        '9 alt="Cat"',
        '11 aria-description="Opens a menu"',
        '11 aria-valuetext="Half"',
        '11 aria-roledescription="slide"',
        '11 aria-placeholder="Pick"',
        '11 label="Name"',
        '11 summary="Totals"',
        '13 title="a > b means more"',
        "16 setAttribute('aria-label', 'Close menu')",
        '20 Hello',
        '25 Not covered',
      ],
    );
  });

  it('passes holes that are not visible text or are localized', () => {
    assert.deepEqual(findVisibleStrings(fixture('visible-strings-good-holes.js.txt')), []);
  });

  it('needs a reason of four or more characters', () => {
    assert.equal(findVisibleStrings('// visible-string: abc\nexport const x = html`<b>Hello</b>`;').length, 1);
    assert.equal(findVisibleStrings('// visible-string: abcd\nexport const x = html`<b>Hello</b>`;').length, 0);
  });
});

describe('the visible-strings CLI (minor 22)', () => {
  const script = fileURLToPath(new URL('../visible-strings.mjs', import.meta.url));

  /** A temporary repository with every package folder and `files` written under it. */
  const tree = (/** @type {Record<string, string>} */ files) => {
    const base = mkdtempSync(join(tmpdir(), 'focsd-vs-cli-'));

    for (const name of ['primitives', 'components', 'charts', 'data-grid', 'editor', 'ai'])
      mkdirSync(join(base, 'packages', name, 'src'), { recursive: true });

    for (const [path, text] of Object.entries(files)) writeFileSync(join(base, path), text);

    return base;
  };

  it('exits 1 and prints file:line for a finding', () => {
    const base = tree({ 'packages/components/src/bad.js': fixture('visible-strings-bad.js.txt') });
    const run = spawnSync(process.execPath, [script, '--root', base], { encoding: 'utf8' });

    assert.equal(run.status, 1);
    assert.match(run.stderr, /packages\/components\/src\/bad\.js:3 literal visible text: Save changes/);
  });

  it('exits 0 on a clean tree', () => {
    const base = tree({ 'packages/components/src/good.js': fixture('visible-strings-good.js.txt') });
    const run = spawnSync(process.execPath, [script, '--root', base], { encoding: 'utf8' });

    assert.equal(run.status, 0, run.stderr);
  });
});

describe('visible strings assigned in code (review item 130)', () => {
  it('flags lettered literals assigned to visible properties', () => {
    const found = findVisibleStrings(`el.ariaLabel = 'Close';\nel.title = open ? 'Hide' : 'Show';\nnote.textContent = 'Saved';`);

    assert.deepEqual(
      found.map((f) => `${f.line} ${f.kind} ${f.text}`),
      ["1 property .ariaLabel = 'Close'", "2 property .title = 'Hide'", "2 property .title = 'Show'", "3 property .textContent = 'Saved'"],
    );
  });

  it('allows terms, non-visible properties, empty and number-only strings, and marked lines', () => {
    const found = findVisibleStrings(
      [
        "el.ariaLabel = this.localize.term('close');",
        "el.className = 'Primary';",
        "el.textContent = '';",
        "el.title = '42';",
        "// visible-string: a brand name, never translated\nel.title = 'Focsd';",
      ].join('\n'),
    );

    assert.deepEqual(found, []);
  });
});
