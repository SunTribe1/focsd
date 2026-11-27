// @vitest-environment happy-dom
// Package wiring: the entry defines every element, and `sideEffects` keeps each element module
// (and the icon registry) when a bundler sees a per-file import.
import { expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// happy-dom's global URL cannot build file URLs, so resolve paths with node:path.
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const srcDir = join(root, 'src');
const files = readdirSync(srcDir).filter((f) => f.endsWith('.js') && f !== 'index.js');

const TAGS = [
  'attachment-tile',
  'chat-message',
  'chat-thread',
  'composer',
  'file-changes',
  'message-actions',
  'prompt-suggestions',
  'reasoning',
  'source-chip',
  'streaming-text',
  'tool-call',
].map((name) => `focsd-${name}`);

// The first import loads every element module from source; under a full parallel test run it took
// 5 s, the default limit.
it('importing the entry defines all eleven elements', { timeout: 20_000 }, async () => {
  await import('../src/index.js');

  expect(TAGS.filter((tag) => !customElements.get(tag))).toEqual([]);
});

it('the entry exports every element class', async () => {
  const entry = await import('../src/index.js');

  expect(Object.keys(entry).filter((k) => k.startsWith('Focsd')).length).toBe(TAGS.length);
});

it('sideEffects lists the entry and every element module, in src and dist', () => {
  const effects = new Set(pkg.sideEffects);
  const wanted = files.filter((f) => !['error-text.js', 'relay.js'].includes(f)).flatMap((f) => [`./src/${f}`, `./dist/${f}`]);

  expect(wanted.filter((f) => !effects.has(f))).toEqual([]);
  expect(effects.has('./src/index.js') && effects.has('./dist/index.js')).toBe(true);
});

it('is published: not private, public access', () => {
  expect(pkg.private).toBeUndefined();
  expect(pkg.publishConfig.access).toBe('public');
});
