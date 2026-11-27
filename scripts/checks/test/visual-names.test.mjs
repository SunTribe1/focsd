import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { it } from 'node:test';

// Every screenshot is stored by name alone (`__screenshots__/<platform>/<name>.png`), so two specs
// that use one name overwrite each other's baseline, and one of them always fails. visual.spec.js
// names each playground page's full-page shot `<page>-<theme>.png`; no other spec may reuse that.
const playground = new URL('../../../apps/playground/', import.meta.url);
const e2e = new URL('e2e/', playground);

const pages = new Set(readdirSync(playground).flatMap((file) => (file.endsWith('.html') ? [file.replace(/\.html$/, '')] : [])));

/** Each `toHaveScreenshot(`<name>-${theme}.png`)` in a spec other than visual.spec.js. */
const themedNames = readdirSync(e2e)
  .filter((file) => file.endsWith('.spec.js') && file !== 'visual.spec.js')
  .flatMap((file) =>
    [...readFileSync(new URL(file, e2e), 'utf8').matchAll(/toHaveScreenshot\(`([\w-]+)-\$\{theme\}\.png`/g)].map(([, name = '']) => ({
      file,
      name,
    })),
  );

it('no spec reuses a full-page screenshot name of visual.spec.js', () => {
  const collisions = themedNames.flatMap(({ file, name }) => (pages.has(name) ? [`${file}: ${name}`] : []));

  assert.deepEqual(collisions, []);
});

it('no two specs share a screenshot name', () => {
  const owners = new Map();

  for (const { file, name } of themedNames) owners.set(name, [...(owners.get(name) ?? []), file]);
  const shared = [...owners].flatMap(([name, files]) => (new Set(files).size > 1 ? [`${name}: ${files.join(', ')}`] : []));

  assert.deepEqual(shared, []);
});
