import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const MODULE = new URL('../src/data/catalogue.js', import.meta.url).href;

/** Run a snippet that imports the catalogue from a working directory outside the repo. */
const inElsewhere = (body) =>
  JSON.parse(
    execFileSync(process.execPath, ['--input-type=module', '-e', `import * as c from '${MODULE}'; console.log(JSON.stringify(${body}));`], {
      cwd: tmpdir(),
      encoding: 'utf8',
    }),
  );

test('the catalogue resolves the repo from its own location, not the working directory', () => {
  assert.ok(inElsewhere('c.components.length') > 50);
});

test('every manifest in packages/*/ is read, so a new element package needs no edit here', () => {
  const tags = inElsewhere('c.allTags');
  assert.ok(tags.includes('focsd-button'));
  assert.ok(tags.includes('focsd-data-grid'));
  assert.ok(tags.includes('focsd-chart'));
  assert.ok(tags.includes('focsd-rich-text'));
});

test('module specifiers come from the owning package name', () => {
  const byTag = inElsewhere('Object.fromEntries(c.components.map((x) => [x.tag, x.module]))');
  assert.equal(byTag['focsd-data-grid'], '@focsd/data-grid');
  assert.equal(byTag['focsd-chart'], '@focsd/charts');
  assert.equal(byTag['focsd-rich-text'], '@focsd/editor');
  assert.equal(byTag['focsd-select'], '@focsd/components/focsd-select.js');
});

test('React wrappers are read from @focsd/react, not listed by hand', () => {
  const wrappers = inElsewhere('[...c.reactWrappers]');
  assert.ok(wrappers.includes('Button'));
  assert.ok(wrappers.includes('DataGrid') || wrappers.length > 50);
});
