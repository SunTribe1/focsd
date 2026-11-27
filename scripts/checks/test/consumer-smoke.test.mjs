// The consumer smoke's install wiring (wave 20 review I8, minor 26), checked without the registry.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { linkedDependencies, onlineManifest } from '../../smoke/consumer.mjs';

/** Pack a fake package `name@9.9.9` into `work`; returns the tarball path. */
function pack(/** @type {string} */ work, /** @type {string} */ name, /** @type {Record<string, string>} */ dependencies = {}) {
  const dir = join(work, 'src', name.replace('/', '-'));

  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, version: '9.9.9', dependencies }));
  writeFileSync(join(dir, 'index.js'), `export default '${name}';\n`);
  const file = execFileSync('npm', ['pack', '--silent', '--pack-destination', work], { cwd: dir, encoding: 'utf8' }).trim();

  return join(work, file);
}

/** Two packed fake packages; `a` depends on a `b` range that only the override can satisfy offline. */
function fakes() {
  const work = mkdtempSync(join(tmpdir(), 'focsd-override-'));
  const app = join(work, 'app');

  mkdirSync(app);

  // `@focsd-dev/zz-smoke-b@^10` exists nowhere: without the override npm has to ask the registry.
  return {
    app,
    tarballs: {
      '@focsd-dev/zz-smoke-a': pack(work, '@focsd-dev/zz-smoke-a', { '@focsd-dev/zz-smoke-b': '^10.0.0' }),
      '@focsd-dev/zz-smoke-b': pack(work, '@focsd-dev/zz-smoke-b'),
    },
  };
}

/** `npm install --offline` with `manifest` (vite left out: the test has no registry). */
function install(/** @type {string} */ app, /** @type {Record<string, any>} */ manifest) {
  const dependencies = Object.fromEntries(Object.entries(manifest.dependencies).filter(([name]) => name !== 'vite'));

  writeFileSync(join(app, 'package.json'), JSON.stringify({ ...manifest, dependencies }));

  return spawnSync('npm', ['install', '--offline', '--no-audit', '--no-fund', '--ignore-scripts'], { cwd: app, encoding: 'utf8' });
}

describe('onlineManifest (I8)', () => {
  it('depends on every tarball and overrides every @focsd-dev/* name to its tarball', () => {
    const manifest = onlineManifest({ '@focsd-dev/a': '/t/focsd-a-1.0.0.tgz', '@focsd-dev/b': '/t/focsd-b-1.0.0.tgz' });

    assert.deepEqual(manifest.dependencies, {
      '@focsd-dev/a': 'file:/t/focsd-a-1.0.0.tgz',
      '@focsd-dev/b': 'file:/t/focsd-b-1.0.0.tgz',
      vite: '8.3.2',
    });
    assert.deepEqual(manifest.overrides, { '@focsd-dev/a': '$@focsd-dev/a', '@focsd-dev/b': '$@focsd-dev/b' });
  });

  it('with the overrides, npm resolves a tarball’s own @focsd-dev dependency to the local tarball, offline', () => {
    const { app, tarballs } = fakes();
    const run = install(app, onlineManifest(tarballs));

    assert.equal(run.status, 0, run.stderr);
    const lock = JSON.parse(readFileSync(join(app, 'package-lock.json'), 'utf8'));

    const resolved = Object.entries(lock.packages)
      .filter(([path]) => path.endsWith('node_modules/@focsd-dev/zz-smoke-b'))
      .map(([, entry]) => entry.resolved);

    assert.ok(resolved.length > 0);
    assert.ok(
      resolved.every((url) => url.startsWith('file:')),
      resolved.join(),
    );
  });

  it('without the overrides the same install needs the registry (the negative twin)', () => {
    const { app, tarballs } = fakes();
    const manifest = onlineManifest(tarballs);

    assert.notEqual(install(app, { name: manifest.name, private: true, dependencies: manifest.dependencies }).status, 0);
  });
});

describe('linkedDependencies (minor 26)', () => {
  it('links third-party dependencies and the peer dependencies the monorepo has, never @focsd-dev packages', () => {
    const manifest = {
      dependencies: { lit: '^3', '@focsd-dev/components': 'workspace:*' },
      peerDependencies: { react: '>=19', '@focsd-dev/charts': 'workspace:^' },
    };

    assert.deepEqual(
      linkedDependencies(manifest, (name) => name !== 'missing'),
      ['lit', 'react'],
    );
    assert.deepEqual(
      linkedDependencies({ peerDependencies: { missing: '1' } }, (name) => name !== 'missing'),
      [],
    );
  });
});
