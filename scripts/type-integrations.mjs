/**
 * Framework typings and editor data for a package, generated from its custom-elements.json.
 * Usage (from the package directory): node ../../scripts/type-integrations.mjs
 *
 * Writes into ./types:
 *   jsx.d.ts      CustomElements map (React 19, Preact, Solid and other JSX)
 *   react.d.ts    augments React's JSX.IntrinsicElements with every element
 *   vue.d.ts      augments Vue's GlobalComponents
 *   svelte.d.ts   augments svelte/elements SvelteHTMLElements
 * and at the package root:
 *   vscode.html-custom-data.json, vscode.css-custom-data.json, web-types.json (JetBrains)
 */
import { existsSync, writeFileSync } from 'node:fs';
import { generateJsxTypes } from 'custom-element-jsx-integration';
import { generateVuejsTypes } from 'custom-element-vuejs-integration';
import { generateSvelteTypes } from 'custom-element-svelte-integration';
import { generateVsCodeCustomElementData } from 'custom-element-vs-code-integration';
import { generateJetBrainsWebTypes } from 'custom-element-jet-brains-integration';
import { MissingFileError, readJson, readText, runScript } from './lib/read.mjs';

// The generators wrap an event's type in `CustomEvent<...>`. A plain DOM event (Event, ...) has no
// detail, so its type is dropped; a `CustomEvent<Detail>` becomes `Detail`, imported from the
// package entry inline so the generators do not import the same name twice.
const DOM_EVENTS = /^(Custom|Keyboard|Mouse|Pointer|Focus|Input|Submit|Toggle)?Event$/;
const DETAIL = /^CustomEvent<([A-Za-z]\w*)>$/;

/** Private signals between elements: never part of the public typings. */
const INTERNAL_EVENTS = new Set(['focsd-tree-item-change']);

/** @param {string | undefined} name */
const isInternal = (name) =>
  !name || name.startsWith('_') || name.startsWith('#') || /^(hostAria|ariaTarget$|invalidTargets$|emitValue$|idrefText$)/.test(name);

/** @param {{ name?: string }} event */
const isPublicEvent = (event) => Boolean(event.name) && !INTERNAL_EVENTS.has(/** @type {string} */ (event.name));

/**
 * Keep the public events and give each the detail type the generators expect.
 * @param {any} manifest
 */
function mapEventTypes(manifest) {
  for (const mod of manifest.modules ?? []) {
    for (const decl of mod.declarations ?? []) {
      decl.events = (decl.events ?? []).filter(isPublicEvent);

      for (const event of decl.events) {
        const text = event.type?.text ?? '';
        const detail = DETAIL.exec(text)?.[1];

        if (detail) event.type = { text: `import('./index.js').${detail}` };
        else if (DOM_EVENTS.test(text)) delete event.type;
      }
    }
  }
}

/**
 * Each custom event name with its detail types, for the HTMLElementEventMap augmentation.
 * @param {any} manifest
 * @returns {[string, string[]][]}
 */
function customEventDetails(manifest) {
  /** @type {Map<string, Set<string>>} */
  const byName = new Map();

  for (const decl of manifest.modules.flatMap((/** @type {any} */ mod) => mod.declarations ?? [])) {
    if (!decl.tagName) continue;

    for (const event of decl.events ?? []) {
      if (!event.type?.text?.startsWith('import(')) continue;
      byName.set(event.name, (byName.get(event.name) ?? new Set()).add(event.type.text));
    }
  }

  return [...byName].map(([name, types]) => [name, [...types].toSorted()]).toSorted(([a], [b]) => a.localeCompare(b));
}

/**
 * Typings must compile with skipLibCheck: false. Keep only the public surface: no internal
 * (`_x`, hostAria*) members, and one entry per name (an attribute wins over the property it sets,
 * for example `selected` → defaultSelected over the live `selected`).
 * @param {any} manifest
 */
function keepPublicSurface(manifest) {
  for (const mod of manifest.modules ?? []) {
    for (const decl of mod.declarations ?? []) {
      decl.attributes = (decl.attributes ?? []).filter((a) => !isInternal(a.fieldName) && !a.name.startsWith('aria-'));
      const attributeNames = new Set(decl.attributes.map((a) => a.name.toLowerCase()));
      const seen = new Set();

      decl.members = (decl.members ?? []).filter((m) => {
        if (isInternal(m.name) || m.privacy === 'private' || m.privacy === 'protected') return false;
        const key = m.name.toLowerCase();

        if (attributeNames.has(key) || seen.has(key)) return false;
        seen.add(key);

        return true;
      });
    }
  }
}

/**
 * @param {any} manifest
 * @param {{ name: string }} pkg
 */
function writeFrameworkTypes(manifest, pkg) {
  const shared = { outdir: 'types', globalTypePath: './index.js', hideLogs: true };

  generateJsxTypes(manifest, { ...shared, fileName: 'jsx.d.ts' });
  generateVuejsTypes(manifest, { ...shared, fileName: 'vue.d.ts' });
  generateSvelteTypes(manifest, { ...shared, fileName: 'svelte.d.ts' });

  // The Svelte generator refers to React's global JSX namespace, which Svelte projects do not have.
  writeFileSync(
    'types/svelte.d.ts',
    readText('types/svelte.d.ts')
      .replaceAll('JSX.Element', 'unknown')
      .replaceAll('JSX.CSSProperties', 'string | Record<string, string | number>'),
  );

  writeFileSync(
    'types/react.d.ts',
    `/** Focsd elements in React's JSX. Add once, for example in a global .d.ts file: \`import type {} from '${pkg.name}/react';\` */
import type { CustomElements } from './jsx.js';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends CustomElements {}
  }
}
`,
  );
}

/** @param {any} manifest */
function writeEditorData(manifest) {
  generateVsCodeCustomElementData(manifest, {
    outdir: '.',
    htmlFileName: 'vscode.html-custom-data.json',
    cssFileName: 'vscode.css-custom-data.json',
    hideLogs: true,
  });
  generateJetBrainsWebTypes(manifest, { outdir: '.', packageJson: false, hideLogs: true });
}

/**
 * document.createElement('focsd-button') and querySelector('focsd-button') return the element's
 * class. Reference the tag map from the index and from every module that defines elements, so
 * importing a single component file (`@focsd-dev/components/focsd-button.js`) also types its tags.
 * @param {any} manifest
 */
function writeTagMap(manifest) {
  const tags = manifest.modules
    .flatMap((mod) => mod.declarations ?? [])
    .filter((d) => d.tagName && d.name)
    .map((d) => [d.tagName, d.name]);

  const events = customEventDetails(manifest);

  writeFileSync(
    'types/elements.d.ts',
    `import type { ${[...new Set(tags.map(([, name]) => name))].join(', ')} } from './index.js';

declare global {
  interface HTMLElementTagNameMap {
${tags.map(([tag, name]) => `    '${tag}': ${name};`).join('\n')}
  }${
    events.length
      ? `

  /** \`addEventListener('focsd-…', e => e.detail)\` is typed. */
  interface HTMLElementEventMap {
${events.map(([name, types]) => `    '${name}': CustomEvent<${types.join(' | ')}>;`).join('\n')}
  }`
      : ''
  }
}

export {};
`,
  );

  const declarationFiles = new Set([
    'types/index.d.ts',
    ...manifest.modules
      .filter((mod) => (mod.declarations ?? []).some((d) => d.tagName))
      .map((mod) => mod.path.replace(/^.*?src\//, 'types/').replace(/\.js$/, '.d.ts')),
  ]);

  for (const file of declarationFiles) {
    if (!existsSync(file)) continue;
    const source = readText(file);

    if (!source.includes('elements.d.ts')) writeFileSync(file, `/// <reference path="./elements.d.ts" />\n${source}`);
  }
}

runScript(() => {
  const manifest = readJson('custom-elements.json', 'run this from a package directory after `pnpm analyze` (or `pnpm build`)');
  const pkg = readJson('package.json', 'run this from a package directory');

  if (!existsSync('types/index.d.ts')) {
    throw new MissingFileError('types/index.d.ts not found: emit the declarations first (`node ../../scripts/emit-types.mjs`).');
  }

  mapEventTypes(manifest);
  keepPublicSurface(manifest);
  writeFrameworkTypes(manifest, pkg);
  writeEditorData(manifest);
  writeTagMap(manifest);
  console.log(`Typings written for ${pkg.name}.`);
});
