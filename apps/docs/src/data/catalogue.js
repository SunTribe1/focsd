/**
 * Component data for the docs, read at build time from the repo's own sources of truth:
 * the MVP catalog (name, tag, category, pattern) and the custom elements manifest (API).
 */
import { existsSync, readdirSync } from 'node:fs';
import { readRepoJson, readRepoText as read, repoPath } from '../lib/repo.js';

/** Every package that defines elements has a `custom-elements.json`; the folders are the source of truth. */
const packageDirs = readdirSync(repoPath('packages'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(repoPath(`packages/${entry.name}/custom-elements.json`)))
  .map((entry) => entry.name)
  .toSorted();

const manifests = packageDirs.map((dir) => ({ dir, ...readRepoJson(`packages/${dir}/custom-elements.json`) }));

const allModules = manifests.flatMap((m) => m.modules.map((module) => ({ ...module, packageDir: m.dir })));

/** Package name by folder, e.g. `data-grid` → `@focsd/data-grid`. */
const packageNames = new Map(packageDirs.map((dir) => [dir, readRepoJson(`packages/${dir}/package.json`).name]));

/** Every tagged declaration in the manifests, by tag name. */
const declarations = new Map(allModules.flatMap((m) => m.declarations ?? []).flatMap((d) => (d.tagName ? [[d.tagName, d]] : [])));

/** Module that defines each tag: [package folder, path inside it]. */
const modules = new Map(
  allModules.flatMap((m) => (m.exports ?? []).filter((e) => e.kind === 'custom-element-definition').map((e) => [e.name, m])),
);

/**
 * Import specifier for a tag's module: a subpath of @focsd/components (each element has its own
 * module there), or the package itself for the packages that load as one.
 * @param {string} tag
 */
function moduleFor(tag) {
  const defined = modules.get(tag);

  if (!defined) return '@focsd/components';
  const inside = defined.path.slice(`packages/${defined.packageDir}/src/`.length);

  return defined.packageDir === 'components' && defined.path.startsWith(`packages/components/src/`)
    ? `@focsd/components/${inside}`
    : (packageNames.get(defined.packageDir) ?? '@focsd/components');
}

/**
 * PascalCase names of the elements `@focsd/react` wraps, read from its entry file.
 * @type {Set<string>}
 */
export const reactWrappers = new Set(
  [...read('packages/react/src/index.js').matchAll(/^export \{ (\w+) \} from /gm)].map((match) => match[1]),
);

/** Category order for the sidebar and index. */
export const CATEGORIES = [
  'Actions',
  'Forms',
  'Overlays',
  'Navigation',
  'Disclosure',
  'Data',
  'Charts',
  'Display',
  'Feedback',
  'Layout',
  'Utility',
  'AI',
];

const ROW = /^\| (\d+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| (\d+) \| ([a-z]+) \|$/;

/**
 * @typedef {{ number: number, name: string, tag: string, slug: string, category: string, pattern: string, wave: number, module: string }} CatalogueEntry
 * @returns {CatalogueEntry[]}
 */
function parseCatalogue() {
  const entries = [];

  for (const line of read('docs/components-catalogue.md').split('\n')) {
    const match = ROW.exec(line.trim());

    if (!match) continue;
    const [, number, name, tags, category, pattern, wave, status] = match.map((v) => v.trim());

    // A planned row has no element in the manifest yet; its page appears when the row becomes built.
    if (status === 'planned') continue;
    const tag = [...tags.matchAll(/`(focsd-[a-z-]+)`/g)].map((m) => m[1]).find((t) => declarations.has(t));

    if (!tag) throw new Error(`Catalog row ${number} (${name}) has no tag defined in the manifest.`);
    const module = moduleFor(tag);
    entries.push({ number: Number(number), name, tag, slug: tag.replace(/^focsd-/, ''), category, pattern, wave: Number(wave), module });
  }

  return entries;
}

export const components = parseCatalogue();

/** Components grouped by category, in CATEGORIES order. */
export const byCategory = CATEGORIES.flatMap((category) => {
  const items = components.filter((c) => c.category === category).toSorted((a, b) => a.name.localeCompare(b.name));

  return items.length ? [{ category, items }] : [];
});

const clean = (text) => (text ?? '').replaceAll(/^'|'$/g, '');

/**
 * @typedef {{ name: string, field: string, type: string, default: string }} AttributeDoc
 * @typedef {{ name: string, params: string | null, description: string }} MethodDoc
 * @typedef {{ name: string, description: string }} NamedDoc
 * @typedef {{
 *   className: string, description: string, attributes: AttributeDoc[], events: NamedDoc[],
 *   slots: NamedDoc[], parts: NamedDoc[], methods: MethodDoc[],
 * }} ComponentApi
 */

/**
 * Public API of a tag from the manifest.
 * @param {string} tag
 * @returns {ComponentApi}
 */
export function apiFor(tag) {
  const d = declarations.get(tag);

  const attributes = (d.attributes ?? [])
    .filter((a) => a.name && !a.name.startsWith('_'))
    .map((a) => ({ name: a.name, field: a.fieldName, type: a.type?.text ?? '', default: clean(a.default) }));

  const methods = (d.members ?? [])
    .filter(
      (m) => m.kind === 'method' && !m.privacy && !m.static && !m.name.startsWith('_') && !LIFECYCLE.has(m.name) && !HOOKS.test(m.name),
    )
    .map((m) => ({ name: m.name, params: (m.parameters ?? []).map((p) => p.name).join(', '), description: m.description ?? '' }));

  return {
    className: d.name,
    description: d.description ?? '',
    attributes,
    events: (d.events ?? [])
      .filter((e) => e.name && !e.name.startsWith('focsd-'))
      .map((e) => ({ name: e.name, description: e.description ?? '' })),
    slots: (d.slots ?? []).map((s) => ({ name: s.name || '(default)', description: s.description ?? '' })),
    parts: (d.cssParts ?? []).map((p) => ({ name: p.name, description: p.description ?? '' })),
    methods: dedupe(methods),
  };
}

const LIFECYCLE = new Set([
  'render',
  'updated',
  'willUpdate',
  'firstUpdated',
  'connectedCallback',
  'disconnectedCallback',
  'attributeChangedCallback',
  'formResetCallback',
  'formDisabledCallback',
  'formStateRestoreCallback',
  'formAssociatedCallback',
  'createRenderRoot',
  'requestUpdate',
  'performUpdate',
  'shouldUpdate',
  'update',
  'getUpdateComplete',
  'scheduleUpdate',
]);

/** Extension hooks for subclasses and internal helpers: not part of the element's public API. */
const HOOKS =
  /^(render|handle|is[A-Z]|compute|extra|on[A-Z])|^(optionId|displayText|formValue|formState|restoreState|emit|syncCalendar|applyCalendar|describedBy|checkDate|choose|clearText)$/;

const dedupe = (list) => [...new Map(list.map((m) => [m.name, m])).values()];

/** Tags defined by the manifest (including sub-elements such as focsd-option). */
export const allTags = [...declarations.keys()];
