// Each element has its own entry point that loads only the component module defining it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const pkg = JSON.parse(read('../package.json'));

/** @param {string} dir */
const tagged = (dir) =>
  JSON.parse(read(`../../${dir}/custom-elements.json`)).modules.flatMap((m) =>
    (m.declarations ?? []).filter((d) => d.tagName && d.name).map((d) => ({ ...d, module: m.path.split('/').pop() })),
  );

const elements = tagged('components');

/** The data grid, chart and rich-text wrappers load their own package (an optional peer). */
const others = [
  ...tagged('data-grid').map((d) => ({ ...d, pkg: '@focsd/data-grid' })),
  ...tagged('charts').map((d) => ({ ...d, pkg: '@focsd/charts' })),
  ...tagged('editor').map((d) => ({ ...d, pkg: '@focsd/editor' })),
  ...tagged('ai').map((d) => ({ ...d, pkg: '@focsd/ai' })),
];

const imports = (text) => [...text.matchAll(/from '([^']+)'/g)].map((m) => m[1]);

test('package exports a subpath per element', () => {
  assert.deepEqual(pkg.exports['./*'], { types: './src/elements/*.d.ts', default: './src/elements/*.js' });
});

test('every element has an entry that imports only its own component module', () => {
  for (const d of elements) {
    const slug = d.tagName.replace(/^focsd-/, '');
    const url = new URL(`../src/elements/${slug}.js`, import.meta.url);
    assert.ok(existsSync(url), `missing src/elements/${slug}.js`);
    const components = imports(readFileSync(url, 'utf8')).filter((s) => s.startsWith('@focsd/'));
    assert.deepEqual(components, [`@focsd/components/${d.module}`], slug);
    assert.ok(existsSync(new URL(`../src/elements/${slug}.d.ts`, import.meta.url)), `missing src/elements/${slug}.d.ts`);
  }
});

test('the data grid, charts, rich-text and AI kit have subpath-only wrappers that import their own package', () => {
  assert.deepEqual(
    others.map((d) => d.tagName),
    ['focsd-data-grid', ...tagged('charts').map((d) => d.tagName), 'focsd-rich-text', ...tagged('ai').map((d) => d.tagName)],
  );

  for (const d of others) {
    const slug = d.tagName.replace(/^focsd-/, '');
    const url = new URL(`../src/elements/${slug}.js`, import.meta.url);
    assert.ok(existsSync(url), `missing src/elements/${slug}.js`);
    assert.deepEqual(
      imports(readFileSync(url, 'utf8')).filter((s) => s.startsWith('@focsd/')),
      [d.pkg],
      slug,
    );
    assert.ok(!read('../src/index.js').includes(`./elements/${slug}.js`), `${slug} must stay out of the main entry`);
    assert.equal(pkg.peerDependenciesMeta?.[d.pkg]?.optional, true, `${d.pkg} is an optional peer`);
  }
});

test('the private tree item signal is not a React prop', () => {
  assert.ok(!read('../src/elements/tree-item.js').includes('focsd-tree-item-change'));
  assert.ok(!read('../src/elements/tree-item.d.ts').includes('FocsdTreeItemChange'));
});

test('the main entry re-exports the element entries instead of the whole components barrel', () => {
  const sources = imports(read('../src/index.js'));
  assert.ok(!sources.includes('@focsd/components'));
  assert.equal(sources.filter((s) => s.startsWith('./elements/')).length, elements.length);
});
