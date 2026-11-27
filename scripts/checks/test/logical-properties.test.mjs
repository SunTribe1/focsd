import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkRepository, findPhysical, findPhysicalInScript } from '../logical-properties.mjs';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

describe('findPhysical', () => {
  it('flags every kind of physical property (RED proof)', () => {
    const found = findPhysical(fixture('logical-properties-bad.css.txt'));

    assert.deepEqual(
      found.map((finding) => finding.line),
      [1, 2, 3, 4, 5, 6, 7, 8],
    );
  });

  it('passes logical properties, other uses of left, and marked lines', () => {
    assert.deepEqual(findPhysical(fixture('logical-properties-good.css.txt')), []);
  });

  it('does not accept a marker without a reason', () => {
    assert.equal(findPhysical('/* physical: */\n.a { left: 0; }').length, 1);
  });
});

describe('findPhysicalInScript', () => {
  it('scans css templates only, with real line numbers', () => {
    const found = findPhysicalInScript(fixture('logical-properties-bad.js.txt'));

    assert.deepEqual(found, [{ line: 5, text: "[part='x'] { margin-right: 4px; }" }]);
  });
});

describe('checkRepository', () => {
  it('fails on a bad css template and a bad stylesheet, and passes the real repository', () => {
    const base = `${mkdtempSync(join(tmpdir(), 'focsd-lp-'))}/`;

    for (const name of ['primitives', 'components', 'charts', 'data-grid', 'editor', 'ai', 'tokens'])
      mkdirSync(`${base}packages/${name}/src`, { recursive: true });
    writeFileSync(`${base}packages/components/src/bad.js`, fixture('logical-properties-bad.js.txt'));
    writeFileSync(`${base}packages/tokens/src/bad.css`, fixture('logical-properties-bad.css.txt'));

    assert.equal(checkRepository(base).length, 9);
    assert.deepEqual(checkRepository(), []);
  });
});

describe('findPhysical (wave 20 review minor 21)', () => {
  it('flags scroll margins, origins and positions with left or right, and asymmetric four-value shorthands', () => {
    assert.deepEqual(
      findPhysical(fixture('logical-properties-bad-more.css.txt')).map((finding) => finding.line),
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
    );
  });

  it('passes symmetric shorthands and origins without left or right', () => {
    assert.deepEqual(findPhysical(fixture('logical-properties-good-more.css.txt')), []);
  });
});

describe('the logical-properties CLI (minor 22)', () => {
  const script = fileURLToPath(new URL('../logical-properties.mjs', import.meta.url));

  /** A temporary repository with every scanned package folder and `files` written under it. */
  const tree = (/** @type {Record<string, string>} */ files) => {
    const base = mkdtempSync(join(tmpdir(), 'focsd-lp-cli-'));

    for (const name of ['primitives', 'components', 'charts', 'data-grid', 'editor', 'ai', 'tokens'])
      mkdirSync(join(base, 'packages', name, 'src'), { recursive: true });

    for (const [path, text] of Object.entries(files)) writeFileSync(join(base, path), text);

    return base;
  };

  it('exits 1 and prints file:line for a finding', () => {
    const base = tree({ 'packages/tokens/src/bad.css': '.ok { color: red; }\n.a { margin-left: 4px; }\n' });
    const run = spawnSync(process.execPath, [script, '--root', base], { encoding: 'utf8' });

    assert.equal(run.status, 1);
    assert.match(run.stderr, /packages\/tokens\/src\/bad\.css:2 physical property: \.a \{ margin-left: 4px; \}/);
  });

  it('exits 0 on a clean tree', () => {
    const base = tree({ 'packages/tokens/src/good.css': fixture('logical-properties-good.css.txt') });
    const run = spawnSync(process.execPath, [script, '--root', base], { encoding: 'utf8' });

    assert.equal(run.status, 0, run.stderr);
  });
});

describe('border-radius corners (review item 130)', () => {
  it('flags a radius whose left and right corners differ', () => {
    assert.equal(findPhysical('border-radius: 4px 0 0 4px;').length, 1);
    assert.equal(findPhysical('border-radius: 8px 4px;').length, 1);
    assert.equal(findPhysical('border-radius: 4px 4px 0;').length, 1);
  });

  it('allows a symmetric radius, logical corners and a marked line', () => {
    assert.deepEqual(findPhysical('border-radius: 4px;'), []);
    assert.deepEqual(findPhysical('border-radius: 4px 4px 0 0;'), []);
    assert.deepEqual(findPhysical('border-radius: var(--r, 4px) var(--r, 4px) 0 0 / 2px 6px;'), []);
    assert.deepEqual(findPhysical('border-start-start-radius: 4px;'), []);
    assert.deepEqual(findPhysical('border-radius: 4px 0 0 4px; /* physical: a left tab */'), []);
  });
});
