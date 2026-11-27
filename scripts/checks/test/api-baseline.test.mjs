import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { gitTagged, writeBaseline } from '../../api-baseline.mjs';

const repoRoot = new URL('../../../', import.meta.url);

/** A temporary repository with two packages that have built manifests. */
function setup() {
  const root = mkdtempSync(join(tmpdir(), 'api-baseline-'));

  for (const [dir, version] of [
    ['box', '1.2.0'],
    ['card', '0.4.1'],
  ]) {
    mkdirSync(join(root, 'packages', dir), { recursive: true });
    writeFileSync(join(root, 'packages', dir, 'package.json'), JSON.stringify({ name: `@x/${dir}`, version }));
    writeFileSync(join(root, 'packages', dir, 'custom-elements.json'), JSON.stringify({ schemaVersion: '1', modules: [] }));
  }

  return root;
}

describe('api-baseline (wave 20 review I7, minor 25)', () => {
  it('stores name, version and manifest, only for the packages that were published', () => {
    const root = setup();
    const written = writeBaseline(root, (name, version) => name === '@x/box' && version === '1.2.0');

    assert.deepEqual(written, ['api/box.cem.json']);
    assert.deepEqual(JSON.parse(readFileSync(join(root, 'api/box.cem.json'), 'utf8')), {
      name: '@x/box',
      version: '1.2.0',
      manifest: { schemaVersion: '1', modules: [] },
      exports: {},
      aliases: {},
    });
    assert.equal(existsSync(join(root, 'api/card.cem.json')), false);
  });

  it('writes nothing when changeset publish published nothing', () => {
    const root = setup();

    assert.deepEqual(
      writeBaseline(root, () => false),
      [],
    );
    assert.equal(existsSync(join(root, 'api')), false);
  });

  it('tells a published version by its git tag (changeset publish tags name@version)', () => {
    const root = setup();
    const git = (/** @type {string[]} */ ...args) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });

    git('init', '-q');
    git('-c', 'user.email=t@example.com', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'x');
    git('tag', '@x/box@1.2.0');

    assert.equal(gitTagged(root)('@x/box', '1.2.0'), true);
    assert.equal(gitTagged(root)('@x/card', '0.4.1'), false);
  });
});

describe('release:publish wiring (wave 20 review I10)', () => {
  const { scripts } = JSON.parse(readFileSync(new URL('package.json', repoRoot), 'utf8'));

  it('writes the baseline right after a successful changeset publish', () => {
    assert.match(scripts['release:publish'], /&& changeset publish --no-git-tag && node scripts\/api-baseline\.mjs$/);
  });

  it('makes no per-package git tags (the Release workflow tags the shared version once)', () => {
    assert.match(scripts['release:publish'], /changeset publish --no-git-tag/);
  });

  it('no other script writes the baseline or publishes', () => {
    for (const [name, command] of Object.entries(scripts)) {
      if (name === 'release:publish') continue;
      assert.doesNotMatch(String(command), /api-baseline|changeset publish/, name);
    }
  });
});
