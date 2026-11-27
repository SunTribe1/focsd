import { test } from 'node:test';
import assert from 'node:assert/strict';
import { usageSnippets } from '../src/lib/usage-snippets.js';
import { SCRIPT_OPEN, SCRIPT_CLOSE } from '../src/data/markup.js';

const select = {
  tag: 'focsd-select',
  slug: 'select',
  module: '@focsd-dev/components/focsd-select.js',
  element: '<focsd-select label="Region">…</focsd-select>',
  event: 'change',
  wrapped: true,
};

test('the script tag halves rebuild a script element without writing one in the source', () => {
  assert.equal(`${SCRIPT_OPEN} type="module">x${SCRIPT_CLOSE}`, '<script type="module">x</script>');
});

test('HTML: import the module once, then the element', () => {
  const { html } = usageSnippets(select);
  assert.equal(html, `<script type="module">\n  import '@focsd-dev/components/focsd-select.js';\n</script>\n\n${select.element}`);
});

test('React with a wrapper uses the typed component and an on<Event> prop', () => {
  const { react } = usageSnippets(select);
  assert.match(react, /^import \{ Select \} from '@focsd-dev\/react';/);
  assert.match(react, /<Select onChange=\{\(e\) => console\.log\(e\.target\)\} label="Region">…<\/Select>/);
});

test('React without a wrapper listens with a ref and cleans up', () => {
  const { react } = usageSnippets({ ...select, wrapped: false });
  assert.match(react, /import \{ useEffect, useRef \} from 'react';/);
  assert.match(react, /addEventListener\('change', handle\)/);
  assert.match(react, /removeEventListener\('change', handle\)/);
  assert.match(react, /<focsd-select ref=\{ref\} label="Region">/);
});

test('without an event no handler is wired in any framework', () => {
  const snippets = usageSnippets({ ...select, event: undefined });
  assert.doesNotMatch(snippets.react, /onChange/);
  assert.doesNotMatch(snippets.vue, /@change/);
  assert.doesNotMatch(snippets.angular, /\(change\)/);
  assert.doesNotMatch(snippets.svelte, /onchange/);
});

test('Vue, Angular and Svelte bind the event in their own syntax', () => {
  const { vue, angular, svelte } = usageSnippets(select);
  assert.match(vue, /<focsd-select @change="onChange" label="Region">/);
  assert.match(vue, /^<script setup>/);
  assert.match(angular, /<focsd-select \(change\)="onChange\(\$event\)" label="Region">/);
  assert.match(angular, /CUSTOM_ELEMENTS_SCHEMA/);
  assert.match(svelte, /<focsd-select onchange=\{\(e\) => console\.log\(e\.target\)\} label="Region">/);
});

test('hyphenated events become camel-case React props', () => {
  const { react } = usageSnippets({ ...select, event: 'focsd-sort' });
  assert.match(react, /onFocsdSort=/);
});
