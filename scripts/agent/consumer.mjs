/**
 * The consumer-facing agent files: AGENTS.md and the Claude skill. Generated from the components'
 * custom elements manifest (element and event counts) and package.json (version, site); served by
 * the docs site at /AGENTS.md and shipped in the `focsd` CLI as the `init --agent` source.
 * Pure text: no reads except `consumerFiles`.
 */
import { readFileSync } from 'node:fs';

const MCP_STDIO = 'npx -y @focsd/mcp';
const MCP_HTTP = 'npx -y @focsd/mcp --http --port 3333';
const MCP_ADD = 'claude mcp add --transport http focsd http://127.0.0.1:3333/mcp';
const MCP_JSON = '{ "mcpServers": { "focsd": { "command": "npx", "args": ["-y", "@focsd/mcp"] } } }';
const MCP_VSCODE = '{ "servers": { "focsd": { "type": "stdio", "command": "npx", "args": ["-y", "@focsd/mcp"] } } }';

/**
 * @typedef {object} ConsumerInput
 * @property {string} version
 * @property {string} site The docs site, no trailing slash.
 * @property {number} elements Registered element count.
 * @property {number} events Distinct `focsd-*` event count.
 */

/**
 * Tags and `focsd-*` event names in a custom elements manifest.
 * @param {{ modules?: { declarations?: { tagName?: string, events?: { name?: string }[] }[] }[] }} cem
 */
export function manifestCounts(cem) {
  const decls = (cem.modules ?? []).flatMap((m) => m.declarations ?? []);
  const tags = new Set(decls.flatMap((d) => (d.tagName ? [d.tagName] : [])));
  const events = new Set(decls.flatMap((d) => (d.events ?? []).flatMap((e) => (e.name?.startsWith('focsd-') ? [e.name] : []))));

  return { elements: tags.size, events: events.size };
}

/** The MCP connect lines, shared by AGENTS.md, SKILL.md and the CLI output. */
export const MCP_LINES = Object.freeze({ stdio: MCP_STDIO, http: MCP_HTTP, add: MCP_ADD, json: MCP_JSON, vscode: MCP_VSCODE });

/** @param {ConsumerInput} input */
export function agentsMd({ version, site, elements, events }) {
  return `# Using Focsd in this project

Focsd ${version} is an accessible web component library (Lit 3, plain ESM). This package, \`@focsd/components\`, defines ${elements} custom elements and ${events} \`focsd-*\` events; the data grid, charts, editor and AI kit are separate packages. Use it instead of hand-rolling controls. Do not guess attributes, events or CSS: read the contract.

## Look things up first

- One element: \`${site}/components/<tag>.md\` (for example \`${site}/components/focsd-button.md\`): attributes, slots, events, parts, CSS properties, keyboard, accessibility, examples.
- Machine-readable: \`${site}/schema/components/<tag>.json\` (JSON Schema) and \`${site}/schema/tokens/index.json\` (design tokens).
- Everything else: \`${site}/llms.txt\`.

## MCP server (optional, recommended)

Same data as tools: search, per-element docs, token lookup, markup validation.

- Claude Code: \`claude mcp add focsd -- ${MCP_STDIO}\`
- Claude Desktop, Cursor, Windsurf: \`${MCP_JSON}\`
- VS Code / GitHub Copilot (\`.vscode/mcp.json\`, note the \`servers\` key): \`${MCP_VSCODE}\`
- HTTP: run \`${MCP_HTTP}\`, then \`${MCP_ADD}\`. Other clients' URL keys: ${site}/getting-started/hosted-mcp/

## Setup

\`\`\`sh
npm install lit @focsd/components @focsd/tokens @focsd/primitives
\`\`\`

\`\`\`js
import '@focsd/tokens/fonts.css'; // optional; without it the system font stack is used
import '@focsd/tokens/tokens.css'; // once, at the top of the app
import '@focsd/components'; // every element, or import one: '@focsd/components/focsd-button.js'
\`\`\`

- Theme: tokens follow the system. Force one with \`data-focsd-theme="light|dark|contrast"\` on \`<html>\` or any section.
- Density: \`data-focsd-density="compact|default|comfortable"\` on \`<body>\` or any section. Comfortable gives 44px targets.
- \`setTheme()\` and \`setDensity()\` from \`@focsd/tokens\` set the same attributes from script.
- To own the source instead, \`npx focsd init\` then \`npx focsd add button\`.
- Blocks: whole pages (\`dashboard\`, \`settings\`, \`sign-in\`, \`empty-app\`) with \`npx focsd add block <name>\` (\`npx focsd list --blocks\` lists them). It writes plain HTML, JS and CSS to \`blocks/<name>/\`, never overwrites a file, and prints the packages to install; edit the copy instead of rebuilding the page by hand.

## Events

- Native names (\`input\`, \`change\`, \`toggle\`, \`close\`, \`cancel\`) mean what they mean on native elements, are plain \`Event\`s and carry no \`detail\`. Read state from the element: \`event.target.value\`, \`.open\`.
- Everything else is \`focsd-<name>\` (a \`CustomEvent\` with a typed \`detail\`) and bubbles, but does not cross a shadow root.
- Each contract lists the exact events of its element. Never invent an event name.

## Theming

- Style with design tokens (\`--focsd-*\` custom properties), not by reaching into shadow roots. Per element, only the \`--focsd-<tag>-*\` properties and \`::part()\` names in its contract are public; \`--_*\` is private.
- Override tokens on \`:root\` or on a section; do not hard-code colors, radii or spacing.
- Keep text and control contrast at WCAG 2.2 AA (4.5:1 text, 3:1 controls). The theme builder at ${site}/foundations/theme-builder/ checks pairs.

## Forms

- Form controls (\`focsd-text-field\`, \`focsd-select\`, \`focsd-checkbox\`...) are form-associated: they take part in \`<form>\`, \`FormData\`, validation and \`name\`/\`value\`. Wrap them in \`focsd-field\` for the label, hint and error.
- To let browser agents use a form, add the WebMCP attributes (\`toolname\`, \`tooldescription\`) and call \`enableWebMCP()\` once from \`@focsd/webmcp\`. Add \`toolautosubmit\` only for forms safe to submit unattended, such as searches.

## Accessibility: do

- Give every control a visible label (\`label\` attribute or \`focsd-field\`); icon-only buttons use \`focsd-icon-button\` with a \`label\`.
- Use \`focsd-dialog\`, \`focsd-menu\`, \`focsd-tabs\` and friends for their patterns: focus, keyboard and ARIA are built in.
- Keep one \`<h1>\` and a sensible heading order; keep a skip link (\`focsd-skip-link\`).

## Accessibility: do not

- Do not add \`role\`, \`aria-*\` or \`tabindex\` to Focsd elements to "fix" them; they already set them.
- Do not remove focus outlines, shrink targets below 24px, or convey state by color alone.
- Do not rebuild a control from \`div\`s when an element exists. Check ${site}/llms.txt first.
`;
}

/** @param {{ site: string }} input */
export function skillMd({ site }) {
  return `---
name: focsd
description: Use when building or editing UI in a project that uses Focsd web components (focsd-* tags, @focsd/* packages): look up an element contract before writing markup, events, styling or forms.
---

# Focsd

Accessible web components. Read AGENTS.md in the project root for setup, events, theming, forms and accessibility rules.

## Look up before you write

1. Find the element: \`${site}/llms.txt\` lists every component and guide.
2. Read its contract: \`${site}/components/<tag>.md\` (attributes, slots, events, parts, keyboard, examples).
3. For tooling, validate against \`${site}/schema/components/<tag>.json\`; tokens are at \`${site}/schema/tokens/index.json\`.
4. Never invent attributes, event names or CSS properties that the contract does not list.

## MCP server

- stdio: \`${MCP_STDIO}\`
- HTTP: \`${MCP_HTTP}\`, then \`${MCP_ADD}\`
`;
}

/**
 * Both files for the components package at `componentsDir` (a URL ending in `/`).
 * @param {URL} componentsDir
 */
export function consumerFiles(componentsDir) {
  const pkg = JSON.parse(readFileSync(new URL('package.json', componentsDir), 'utf8'));
  const cem = JSON.parse(readFileSync(new URL('custom-elements.json', componentsDir), 'utf8'));
  const input = { version: pkg.version, site: String(pkg.homepage).replace(/\/$/, ''), ...manifestCounts(cem) };

  return { agents: agentsMd(input), skill: skillMd(input) };
}
