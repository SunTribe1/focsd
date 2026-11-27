// The server-rendering sweep the element packages share: every tag in a package's custom elements
// manifest renders to Declarative Shadow DOM under @lit-labs/ssr. Each package brings its own Lit and
// SSR modules (and Vitest), so the test passes them in, as the size budgets pass esbuild in.
import { readFileSync } from 'node:fs';

/** Matches the declarative shadow root an element renders on the server. */
export const DECLARATIVE_SHADOW_ROOT = /<template shadowroot(mode)?="open"/;

/**
 * The custom element tag names a manifest declares.
 * @param {URL} manifestUrl the package's custom-elements.json
 * @returns {string[]}
 */
export const manifestTags = (manifestUrl) =>
  JSON.parse(readFileSync(manifestUrl, 'utf8'))
    .modules.flatMap((/** @type {{ declarations?: { tagName?: string }[] }} */ m) => m.declarations ?? [])
    .flatMap((/** @type {{ tagName?: string }} */ d) => (d.tagName ? [d.tagName] : []));

/**
 * Renders `<tag label="Example">Content</tag>` on the server and returns the HTML.
 * @param {{ render: Function, collectResult: Function, html: Function, unsafeStatic: Function }} lit
 *   `render` (@lit-labs/ssr), `collectResult` (@lit-labs/ssr/lib/render-result.js), and `html` and
 *   `unsafeStatic` (lit/static-html.js)
 * @param {string} tag
 * @returns {Promise<string>}
 */
export const renderTag = ({ render, collectResult, html, unsafeStatic }, tag) => {
  const t = unsafeStatic(tag);

  return collectResult(render(html`<${t} label="Example">Content</${t}>`));
};
