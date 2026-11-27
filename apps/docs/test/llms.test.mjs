import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { GUIDE_GROUPS } from '../src/data/sidebar.js';
import { llmsIndex } from '../src/lib/llms.js';

const content = (slug) => ['md', 'mdx'].some((ext) => existsSync(new URL(`../src/content/docs/${slug}.${ext}`, import.meta.url)));

test('every sidebar page exists in the content collection', () => {
  for (const { items } of GUIDE_GROUPS) for (const { slug } of items) assert.ok(content(slug), `${slug} has no page`);
});

test('llms.txt links every page of every sidebar group, labelled as in the sidebar', () => {
  const body = llmsIndex({ categories: [], components: [], summaryOf: () => '' });

  for (const { label, items } of GUIDE_GROUPS) {
    assert.ok(body.includes(`## ${label}`), `section ${label}`);

    for (const item of items) assert.ok(body.includes(`- [${item.label}](/${item.slug}/)`), `${item.slug} listed`);
  }
});

test('llms.txt lists components under their category with the summary', () => {
  const body = llmsIndex({
    categories: ['Actions'],
    components: [{ name: 'Button', tag: 'focsd-button', slug: 'button', category: 'Actions' }],
    summaryOf: (tag) => `About ${tag}`,
  });

  assert.match(body, /## Actions\n\n- \[Button\]\(\/components\/button\/\): About focsd-button/);
});

test('llms.txt links every component contract with its schema, and the DTCG token files', () => {
  const body = llmsIndex({ categories: [], components: [], summaryOf: () => '', contracts: ['focsd-button', 'focsd-option'] });

  for (const tag of ['focsd-button', 'focsd-option']) {
    assert.ok(
      body.includes(`- [<${tag}>](/components/${tag}.md): JSON Schema [/schema/components/${tag}.json](/schema/components/${tag}.json)`),
      tag,
    );
  }

  for (const file of ['index', 'light', 'dark', 'contrast']) assert.ok(body.includes(`(/schema/tokens/${file}.json)`), file);
});

test('llms.txt points agents at AGENTS.md', () => {
  assert.ok(llmsIndex({ categories: [], components: [], summaryOf: () => '' }).includes('[AGENTS.md](/AGENTS.md)'));
});
