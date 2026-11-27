/**
 * "Open in CodePen / StackBlitz" payloads for docs examples. Each is posted by a plain form, so no
 * third-party script runs on the docs. Versions are pinned to the release the docs were built from.
 */

import { readRepoJson } from './repo.js';

/**
 * What a sandbox needs to describe an example.
 * @typedef {object} Sandbox
 * @property {string} title Example title, without the "Focsd ·" prefix.
 * @property {string} html The example's markup.
 * @property {string | undefined} [script] The example's module script, imports included.
 * @property {string} version The published @focsd version to pin (or `latest` before the first release).
 */

const CDN = 'https://cdn.jsdelivr.net/npm';

/** The Vite range the playground builds with, so a StackBlitz project runs on the same major. */
const VITE = readRepoJson('apps/playground/package.json').devDependencies.vite;

const titleOf = (title) => `Focsd · ${title} example`;

const PACKAGE_IMPORT = /from\s+['"](@focsd\/[a-z-]+)['"]/g;

/** Elements that live outside @focsd/components, and the package that defines each. */
const ELEMENT_PACKAGES = {
  'focsd-data-grid': '@focsd/data-grid',
  'focsd-chart': '@focsd/charts',
  'focsd-sparkline': '@focsd/charts',
  'focsd-gauge': '@focsd/charts',
  'focsd-rich-text': '@focsd/editor',
  ...Object.fromEntries(
    [
      'attachment-tile',
      'chat-message',
      'chat-thread',
      'composer',
      'message-actions',
      'prompt-suggestions',
      'reasoning',
      'source-chip',
      'streaming-text',
      'tool-call',
    ].map((name) => [`focsd-${name}`, '@focsd/ai']),
  ),
};

/** Packages the markup's elements need (the docs register these on every page; sandboxes must load them). */
const packagesForHtml = (html) =>
  Object.entries(ELEMENT_PACKAGES)
    .filter(([tag]) => String(html ?? '').includes(`<${tag}`))
    .map(([, pkg]) => pkg);

/** @focsd packages a script imports, besides components and tokens. */
const packagesIn = (script) => [...new Set([...String(script ?? '').matchAll(PACKAGE_IMPORT)].map((m) => m[1]))];

/** CodePen has no bundler: point package imports at jsDelivr's ESM build of the same version. */
const toCdn = (script, version) => String(script ?? '').replaceAll(PACKAGE_IMPORT, (_, name) => `from '${CDN}/${name}@${version}/+esm'`);

/** A script written into HTML or a module must never close a script element by accident. */
const safeScript = (script) => String(script ?? '').replaceAll('</script', '<\\/script');

/**
 * The `data` field for https://codepen.io/pen/define.
 * @param {Sandbox} sandbox
 * @returns {string} JSON
 */
export function codepenData({ title, html, script, version }) {
  const loads = ['@focsd/components', ...packagesForHtml(html)].map((pkg) => `import '${CDN}/${pkg}@${version}/+esm';`).join('\n');
  const js = [loads, safeScript(toCdn(script, version))].filter(Boolean).join('\n\n');

  return JSON.stringify({
    title: titleOf(title),
    html,
    js,
    js_module: true,
    // jsDelivr serves files by path (no package exports map): the stylesheets live in dist/.
    css_external: [`${CDN}/@focsd/tokens@${version}/dist/tokens.css`, `${CDN}/@focsd/tokens@${version}/dist/fonts.css`].join(';'),
    editors: '101',
  });
}

/**
 * Hidden fields for https://stackblitz.com/run: a small Vite project with exact versions.
 * @param {Sandbox} sandbox
 * @returns {[string, string][]} form field name and value pairs
 */
export function stackblitzFields({ title, html, script, version }) {
  const extra = packagesForHtml(html);

  const main = [
    "import '@focsd/tokens/tokens.css';",
    "import '@focsd/tokens/fonts.css';",
    "import '@focsd/components';",
    ...extra.map((pkg) => `import '${pkg}';`),
    '',
    safeScript(script),
  ]
    .join('\n')
    .trimEnd();

  const index = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${titleOf(title)}</title>
  </head>
  <body>
    ${html}
    <script type="module" src="/main.js"></script>
  </body>
</html>
`;

  const pkg = {
    name: 'focsd-example',
    private: true,
    type: 'module',
    scripts: { dev: 'vite' },
    dependencies: Object.fromEntries(
      [...new Set(['@focsd/components', '@focsd/tokens', ...extra, ...packagesIn(script)])].toSorted().map((name) => [name, version]),
    ),
    devDependencies: { vite: VITE },
  };

  return [
    ['project[title]', titleOf(title)],
    ['project[template]', 'node'],
    ['project[files][index.html]', index],
    ['project[files][main.js]', `${main}\n`],
    ['project[files][package.json]', `${JSON.stringify(pkg, null, 2)}\n`],
  ];
}
