import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildAskIndex, shortExample } from '../src/lib/ask-index.js';
import { answer, search, MIN_SCORE } from '../src/components/ask/search.js';
import { components } from '../src/data/catalogue.js';
import { GUIDE_GROUPS } from '../src/data/sidebar.js';

// The "Ask the docs" bot: the index built from the MCP data and the guides, and the search over it.

const data = JSON.parse(readFileSync(new URL('../../../packages/mcp/data/focsd.json', import.meta.url), 'utf8'));
const guides = GUIDE_GROUPS.flatMap((g) => g.items).map((p) => ({ ...p, description: `About ${p.label}.` }));
const entries = buildAskIndex({ components: data.components, pages: new Set(components.map((c) => c.slug)), guides });
const top = (q) => search(entries, q)[0]?.entry.url;

test('the index has one entry per documented component and the guide topics, and no sub-elements', () => {
  const tags = entries.filter((e) => e.kind === 'component').map((e) => e.tag);
  assert.equal(tags.length, components.length);
  assert.ok(!tags.includes('focsd-option'));
  assert.ok(entries.some((e) => e.url === '/foundations/theming/'));
  assert.ok(entries.every((e) => e.url.startsWith('/') && e.url.endsWith('/')));
});

test('examples lose the docs layout wrapper and stay short', () => {
  assert.equal(shortExample('<div class="full"><focsd-chart></focsd-chart></div>'), '<focsd-chart></focsd-chart>');
  assert.ok(entries.every((e) => !e.example || e.example.length <= 600));
});

test('the suggested prompts find the right pages', () => {
  assert.equal(top('How do I build a form with validation?'), '/getting-started/forms/');
  assert.equal(top('Is there a data grid?'), '/components/data-grid/');
  assert.equal(top('How do I theme it?'), '/foundations/theming/');
  assert.equal(top('Does it work with React?'), '/getting-started/frameworks/');
});

test('component names and synonyms find components', () => {
  assert.equal(top('date range picker'), '/components/date-range-picker/');
  assert.equal(top('modal'), '/components/dialog/');
  assert.equal(top('command palette'), '/components/command/');
  assert.equal(top('focsd-switch'), '/components/switch/');
});

test('a good answer names the component, shows a snippet and links its page', () => {
  const reply = answer(entries, 'Is there a data grid?', { count: components.length });
  assert.match(reply.text, /^Yes\. \*\*Data grid\*\* \(`<focsd-data-grid>`\)/);
  assert.match(reply.text, /```html\n<focsd-data-grid/);
  assert.match(reply.text, /\[Data grid\]\(\/components\/data-grid\/\)/);
  assert.equal(reply.sources[0].url, '/components/data-grid/');
});

test('an unknown question says so and links to search', () => {
  const reply = answer(entries, 'What is the airspeed of a swallow?', { count: 128 });
  assert.ok((reply.matches[0]?.score ?? 0) < MIN_SCORE);
  assert.match(reply.text, /^I could not find a clear answer/);
  assert.match(reply.text, /\[searching the docs\]\(\/\?search=What%20is/);
  assert.match(reply.text, /all 128 components/);
});

test('an empty or stop-word query matches nothing', () => {
  assert.deepEqual(search(entries, 'how do I'), []);
});
