/**
 * Builds data/focsd.json, everything the MCP server answers from: components (from the custom
 * elements manifests, the catalogue and the docs examples) and design tokens. Run after the
 * component packages and tokens are built: node scripts/build-data.mjs
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const json = (path) => JSON.parse(read(path));

const PACKAGES = [
  ['@focsd-dev/components', 'packages/components'],
  ['@focsd-dev/data-grid', 'packages/data-grid'],
  ['@focsd-dev/editor', 'packages/editor'],
  ['@focsd-dev/charts', 'packages/charts'],
  ['@focsd-dev/ai', 'packages/ai'],
];

/** Catalogue rows: name, category and pattern for each tag in the row (the first is the main one). */
function catalogue(real) {
  const ROW = /^\| (\d+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| (\d+) \| ([a-z]+) \|$/;
  const rows = new Map();

  for (const line of read('docs/components-catalogue.md').split('\n')) {
    const m = ROW.exec(line.trim());

    if (!m) continue;
    const [name, tags, category, pattern] = m.slice(2, 6).map((v) => v.trim());
    // Only tags that exist as elements (a row may name a concept, like focsd-toast for focsd-toaster).
    const list = [...tags.matchAll(/`(focsd-[a-z-]+)`/g)].flatMap((t) => (real.has(t[1]) ? [t[1]] : []));
    list.forEach((tag, i) => rows.set(tag, { name: i === 0 ? name : null, parent: i === 0 ? null : list[0], category, pattern }));
  }

  return rows;
}

const text = (v) => (v ?? '').toString().replaceAll(/\s+/g, ' ').trim();

const titleCase = (tag) =>
  tag
    .replace(/^focsd-/, '')
    .split('-')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');

/**
 * The catalogue component a sub-element belongs to (focsd-option → focsd-select): among the main
 * components in its family (its own module, and the modules that import it as a part, quality B11),
 * the one whose tag shares the most leading words with it, then the one the catalogue lists first.
 */
function parentIn(tag, moduleTags, rows) {
  const mains = moduleTags.filter((t) => rows.get(t)?.name);

  if (mains.includes(tag)) return null;

  // Most shared leading words wins: focsd-description-item → focsd-description-list, focsd-nav-item → focsd-nav-menu.
  const shared = (a, b) => {
    const [x, y] = [a.split('-'), b.split('-')];
    let n = 0;

    while (n < x.length && x[n] === y[n]) n += 1;

    return n;
  };

  // Ties go to the component listed first in the catalogue (focsd-option → focsd-select, not focsd-combobox).
  const order = [...rows.keys()];
  const best = mains.map((t) => [t, shared(t, tag)]).toSorted((a, b) => b[1] - a[1] || order.indexOf(a[0]) - order.indexOf(b[0]))[0];

  return best?.[0] ?? null;
}

const isPublic = (m) => !m.static && !m.privacy && !m.name.startsWith('_') && !m.name.startsWith('#');
const LIFECYCLE = /Callback$|^render|^(updated|willUpdate|firstUpdated|connectedCallback)$/;
const named = (list) => (list ?? []).map((p) => ({ name: p.name, description: text(p.description) }));

/** Attributes, plus the public properties (not reflected by an attribute) and methods. */
function api(decl) {
  const attributes = (decl.attributes ?? []).map((a) => ({
    name: a.name,
    type: text(a.type?.text),
    default: a.default ?? undefined,
    description: text(a.description),
    property: a.fieldName,
  }));

  const attrFields = new Set(attributes.map((a) => a.property));
  const members = (kind) => (decl.members ?? []).filter((m) => m.kind === kind && isPublic(m));

  const properties = members('field')
    .filter((m) => !attrFields.has(m.name))
    .map((m) => ({ name: m.name, type: text(m.type?.text), description: text(m.description), readonly: Boolean(m.readonly) }));

  const methods = members('method')
    .filter((m) => !LIFECYCLE.test(m.name))
    .map((m) => ({ name: m.name, description: text(m.description) }));

  return { attributes, properties, methods };
}

/** Events, slots, CSS parts and custom properties. */
function surface(decl) {
  return {
    events: named((decl.events ?? []).filter((e) => e.name)),
    slots: (decl.slots ?? []).map((s) => ({ name: s.name || '(default)', description: text(s.description) })),
    cssParts: named(decl.cssParts),
    cssProperties: named(decl.cssProperties),
  };
}

const exampleFor = (examples, tag) => examples[tag.replace(/^focsd-/, '')];

/** Catalogue name, category and pattern; a sub-element takes its parent's category. */
function placement(tag, row, rows) {
  const parentRow = row.parent ? rows.get(row.parent) : null;

  return {
    name: row.name ?? titleCase(tag),
    category: row.category ?? parentRow?.category ?? 'Other',
    pattern: row.pattern ?? '',
    partOf: row.parent ?? null,
  };
}

function component(decl, pkg, modulePath, rows, examples, parent = null) {
  const tag = decl.tagName;
  const row = rows.get(tag) ?? (parent ? { parent } : {});
  const example = exampleFor(examples, tag) ?? (row.parent ? exampleFor(examples, row.parent) : undefined);
  const subpath = modulePath.replace(/^.*?src\//, '');

  return {
    tag,
    ...placement(tag, row, rows),
    package: pkg,
    import: pkg === '@focsd-dev/components' ? `import '@focsd-dev/components/${subpath}';` : `import '${pkg}';`,
    className: decl.name,
    summary: text(example?.summary) || text(decl.description).split('. ')[0],
    description: text(decl.description),
    ...api(decl),
    ...surface(decl),
    example: example?.html ?? '',
    a11y: (example?.a11y ?? []).map(text),
    keyboard: example?.keyboard ?? [],
  };
}

const manifests = PACKAGES.map(([pkg, dir]) => [pkg, json(`${dir}/custom-elements.json`)]);

const realTags = new Set(
  manifests.flatMap(([, m]) => m.modules.flatMap((mod) => (mod.declarations ?? []).map((d) => d.tagName).filter(Boolean))),
);

const rows = catalogue(realTags);
const { examples } = await import(new URL('apps/docs/src/data/examples/index.js', root));
const components = [];
const seen = new Set();

/** Local modules a module imports (`import './focsd-tab.js'`), as repository paths. */
const LOCAL_IMPORT = /^import (?:[^'"]* from )?'(\.\/[^']+)';$/gm;
const localImports = (path) => [...read(path).matchAll(LOCAL_IMPORT)].map((m) => new URL(m[1], new URL(path, root)).pathname);

/** Tags of a module plus the tags of the modules that import it as a part. */
function familyTags(manifest, mod) {
  const tagsOf = (m) => (m.declarations ?? []).map((d) => d.tagName).filter(Boolean);
  const self = new URL(mod.path, root).pathname;
  const importers = manifest.modules.filter((m) => m !== mod && m.path.endsWith('.js') && localImports(m.path).includes(self));

  return [...tagsOf(mod), ...importers.flatMap(tagsOf)];
}

for (const [pkg, manifest] of manifests) {
  for (const mod of manifest.modules) {
    const moduleTags = familyTags(manifest, mod);

    for (const decl of mod.declarations ?? []) {
      if (!decl.tagName || seen.has(decl.tagName)) continue;
      seen.add(decl.tagName);
      components.push(component(decl, pkg, mod.path, rows, examples, parentIn(decl.tagName, moduleTags, rows)));
    }
  }
}

components.sort((a, b) => a.tag.localeCompare(b.tag));

const tokens = new Map();

for (const row of json('packages/tokens/dist/tokens.resolved.json')) {
  if (row.density !== 'default') continue;
  const entry = tokens.get(row.name) ?? { name: row.name, css: row.css, values: {} };
  entry.values[row.theme] = row.value;
  tokens.set(row.name, entry);
}

const { version } = json('packages/components/package.json');
const out = { version, components, tokens: [...tokens.values()] };

// Start from an empty folder: anything left from an older build (or an old package name) would ship.
rmSync(new URL('../data/', import.meta.url), { recursive: true, force: true });

mkdirSync(new URL('../data/', import.meta.url), { recursive: true });

writeFileSync(new URL('../data/focsd.json', import.meta.url), `${JSON.stringify(out)}\n`);

// The same data as a JS module, so runtimes without node:fs (Cloudflare Workers) can import it.
writeFileSync(new URL('../data/focsd.js', import.meta.url), `export default ${JSON.stringify(out)};\n`);

writeFileSync(
  new URL('../data/focsd.d.ts', import.meta.url),
  "import type { CatalogData } from '../types/core.js';\ndeclare const data: CatalogData;\nexport default data;\n",
);

console.log(`✓ data/focsd.json: ${components.length} components, ${tokens.size} tokens (${fileURLToPath(root)})`);
