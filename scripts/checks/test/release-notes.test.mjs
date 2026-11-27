import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { mergeChangelogs } from '../../../apps/docs/src/lib/changelog.js';
import { releaseNotes } from '../../release-notes.mjs';

const md =
  '## 1.1.0\n\n### Minor Changes\n\n- Add a size.\n  - small\n\n### Patch Changes\n\n- Fix focus.\n\n## 1.0.0\n\n### Major Changes\n\n- First release.\n';

describe('releaseNotes', () => {
  const releases = mergeChangelogs([
    { name: '@focsd/a', markdown: md },
    { name: '@focsd/b', markdown: md },
  ]);

  it('lists one version once, across packages', () => {
    const notes = releaseNotes(releases, '1.1.0');

    assert.match(notes, /^## Minor changes\n\n- Add a size\.\n {2}- small\n\n## Patch changes\n\n- Fix focus\./);
    assert.equal(notes.match(/Fix focus/g)?.length, 1);
    assert.doesNotMatch(notes, /First release/);
  });

  it('is empty for a version no package lists', () => {
    assert.equal(releaseNotes(releases, '9.9.9'), '');
  });

  it('writes the notes for the current version from the repository', () => {
    const notes = execFileSync('node', ['scripts/release-notes.mjs', '1.0.0'], { encoding: 'utf8' });

    assert.match(notes, /^## Major changes\n\n- First public release/);
  });
});
