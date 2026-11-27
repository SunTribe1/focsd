import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { codepenData, stackblitzFields } from '../src/lib/sandboxes.js';

const playground = JSON.parse(readFileSync(new URL('../../playground/package.json', import.meta.url), 'utf8'));

const example = {
  title: 'Select',
  html: '<focsd-select label="Region"><focsd-option value="eu">Europe</focsd-option></focsd-select>',
  script:
    "const s = document.querySelector('focsd-select');\ns.addEventListener('change', () => console.log(`chose ${s.value}`)); // </script>",
  version: '0.1.0',
};

test('CodePen: pinned CDN imports, the markup, the script and a title', () => {
  const data = JSON.parse(codepenData(example));
  assert.equal(data.title, 'Focsd · Select example');
  assert.equal(data.html, example.html);
  assert.match(data.js, /import 'https:\/\/cdn\.jsdelivr\.net\/npm\/@focsd-dev\/components@0\.1\.0\/\+esm';/);
  assert.ok(data.js.includes("s.addEventListener('change'"));
  assert.ok(data.css_external.includes('https://cdn.jsdelivr.net/npm/@focsd-dev/tokens@0.1.0/dist/tokens.css'));
  assert.ok(data.css_external.includes('https://cdn.jsdelivr.net/npm/@focsd-dev/tokens@0.1.0/dist/fonts.css'));
  assert.equal(data.js_module, true);
});

test('StackBlitz: a Vite project with exact versions', () => {
  const fields = Object.fromEntries(stackblitzFields(example));
  assert.equal(fields['project[template]'], 'node');
  assert.equal(fields['project[title]'], 'Focsd · Select example');
  const pkg = JSON.parse(fields['project[files][package.json]']);
  assert.deepEqual(pkg.dependencies, { '@focsd-dev/components': '0.1.0', '@focsd-dev/tokens': '0.1.0' });
  assert.equal(pkg.devDependencies.vite, playground.devDependencies.vite);
  assert.equal(pkg.scripts.dev, 'vite');
  assert.match(fields['project[files][main.js]'], /import '@focsd-dev\/tokens\/tokens\.css';/);
  assert.ok(fields['project[files][main.js]'].includes("s.addEventListener('change'"));
  assert.ok(fields['project[files][index.html]'].includes(example.html));
});

test('a script that contains </script> cannot end a script element', () => {
  const fields = Object.fromEntries(stackblitzFields(example));
  const html = fields['project[files][index.html]'];
  assert.equal((html.match(/<\/script>/g) ?? []).length, 1);
  assert.ok(!fields['project[files][main.js]'].includes('</script>'));
  assert.ok(fields['project[files][main.js]'].includes('<\\/script>'));
});

test('examples without a script still run', () => {
  const data = JSON.parse(codepenData({ ...example, script: undefined }));
  assert.match(data.js, /@focsd-dev\/components@0\.1\.0/);
});

test('examples that import other Focsd packages work in both sandboxes', () => {
  const grid = { ...example, script: "import { FocsdDataGrid } from '@focsd-dev/data-grid';\nconsole.log(FocsdDataGrid);" };
  const pen = JSON.parse(codepenData(grid));
  assert.ok(pen.js.includes("from 'https://cdn.jsdelivr.net/npm/@focsd-dev/data-grid@0.1.0/+esm'"));
  assert.ok(!pen.js.includes("from '@focsd-dev/data-grid'"));
  const fields = Object.fromEntries(stackblitzFields(grid));
  assert.equal(JSON.parse(fields['project[files][package.json]']).dependencies['@focsd-dev/data-grid'], '0.1.0');
  assert.ok(fields['project[files][main.js]'].includes("from '@focsd-dev/data-grid'"));
});

test('elements from the data grid, charts and editor packages load those packages', () => {
  for (const [tag, pkg] of [
    ['focsd-data-grid', '@focsd-dev/data-grid'],
    ['focsd-chart', '@focsd-dev/charts'],
    ['focsd-rich-text', '@focsd-dev/editor'],
  ]) {
    const ex = { ...example, html: `<${tag} label="X"></${tag}>`, script: undefined };
    const pen = JSON.parse(codepenData(ex));
    assert.ok(pen.js.includes(`import 'https://cdn.jsdelivr.net/npm/${pkg}@0.1.0/+esm';`), tag);
    const fields = Object.fromEntries(stackblitzFields(ex));
    assert.equal(JSON.parse(fields['project[files][package.json]']).dependencies[pkg], '0.1.0', tag);
    assert.ok(fields['project[files][main.js]'].includes(`import '${pkg}';`), tag);
  }
});
