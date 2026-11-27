import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blockPaths, framePaths } from '../src/data/frames.js';

const components = [
  { slug: 'list', name: 'List' },
  { slug: 'badge', name: 'Badge' },
];

const examples = {
  list: { html: '<focsd-list></focsd-list>', frame: true },
  badge: {
    html: '<focsd-badge></focsd-badge>',
    more: [
      { id: 'indicator', title: 'Indicator', summary: '', html: '<focsd-badge count="3"></focsd-badge>', frame: true },
      { id: 'inline', title: 'Inline', summary: '', html: '<focsd-badge></focsd-badge>' },
    ],
  },
};

const patterns = [{ id: 'shell', title: 'App shell', summary: '', html: '<focsd-app-shell></focsd-app-shell>', frame: true }];

test('every framed example gets a frame page: component, more and pattern examples', () => {
  const paths = framePaths(components, examples, patterns);

  assert.deepEqual(
    paths.map((p) => p.params.slug),
    ['list', 'badge-indicator', 'guide-patterns-shell'],
  );
  assert.deepEqual(paths[1].props, { name: 'Badge: Indicator', html: '<focsd-badge count="3"></focsd-badge>' });
});

test('every block gets a page named after its folder', () => {
  assert.deepEqual(blockPaths([{ name: 'dashboard', title: 'Dashboard' }]), [
    { params: { name: 'dashboard' }, props: { title: 'Dashboard' } },
  ]);
});
