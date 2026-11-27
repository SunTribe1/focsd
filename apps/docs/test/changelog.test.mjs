import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeChangelogs, noteHtml, parseChangelog } from '../src/lib/changelog.js';

const components = `# @focsd-dev/components

## 1.1.0

### Minor Changes

- Add \`focsd-thing\`.

### Patch Changes

- Fix the focus ring.
- Updated dependencies
  - @focsd-dev/tokens@1.1.0

## 1.0.0

### Major Changes

- First public release.
`;

const tokens = `# @focsd-dev/tokens

## 1.1.0

### Patch Changes

- Fix the focus ring.

## 1.0.0

### Major Changes

- First public release.
`;

test('reads entries and drops dependency bumps', () => {
  assert.deepEqual(parseChangelog(components), [
    { version: '1.1.0', kind: 'Minor', text: 'Add `focsd-thing`.' },
    { version: '1.1.0', kind: 'Patch', text: 'Fix the focus ring.' },
    { version: '1.0.0', kind: 'Major', text: 'First public release.' },
  ]);
});

test('merges packages by version, newest first, naming every package once per note', () => {
  const releases = mergeChangelogs([
    { name: '@focsd-dev/tokens', markdown: tokens },
    { name: '@focsd-dev/components', markdown: components },
  ]);

  assert.deepEqual(
    releases.map((r) => r.version),
    ['1.1.0', '1.0.0'],
  );
  assert.deepEqual(releases[0].groups[1], {
    kind: 'Patch',
    notes: [{ text: 'Fix the focus ring.', packages: ['@focsd-dev/components', '@focsd-dev/tokens'] }],
  });
  assert.equal(releases[1].groups[0].notes[0].packages.length, 2);
});

test('orders versions numerically', () => {
  const md = (v) => `## ${v}\n\n### Patch Changes\n\n- Note ${v}.\n`;
  const releases = mergeChangelogs([{ name: 'a', markdown: [md('1.2.0'), md('1.10.0'), md('1.9.1')].join('\n') }]);

  assert.deepEqual(
    releases.map((r) => r.version),
    ['1.10.0', '1.9.1', '1.2.0'],
  );
});

test('puts a release above its pre-releases', () => {
  const md = (v) => `## ${v}\n\n### Patch Changes\n\n- Note ${v}.\n`;
  const versions = ['1.0.0-beta.2', '1.0.0', '1.0.0-beta.10', '0.9.0'];
  const releases = mergeChangelogs([{ name: 'a', markdown: versions.map(md).join('\n') }]);

  assert.deepEqual(
    releases.map((r) => r.version),
    ['1.0.0', '1.0.0-beta.10', '1.0.0-beta.2', '0.9.0'],
  );
});

test('renders inline markdown safely', () => {
  assert.equal(
    noteHtml('Use `<focsd-x>` and **bold** [docs](/components/) <script>\n- one\n- two'),
    'Use <code>&lt;focsd-x&gt;</code> and <strong>bold</strong> <a href="/components/">docs</a> &lt;script&gt;<ul><li>one</li><li>two</li></ul>',
  );
  assert.equal(noteHtml('[x](javascript:alert(1))'), '[x](javascript:alert(1))');
  assert.equal(noteHtml('[x](//evil.example/)'), '[x](//evil.example/)');
});
