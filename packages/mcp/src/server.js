/**
 * Focsd MCP server. Tools and resources for AI coding assistants: find components, read their API
 * and accessibility notes, look up design tokens and setup, and check generated markup.
 */
import { McpServer, ResourceNotFoundError, ResourceTemplate } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { themes } from '@focsd/tokens';
import {
  DEFAULT_SEARCH_LIMIT,
  FRAMEWORKS,
  categories,
  componentMarkdown,
  getComponent,
  getSetup,
  getTokens,
  listComponents,
  searchComponents,
  suggestTags,
  validateMarkup,
  version,
} from './catalog.js';
import { DEFAULT_MAX_RESULT_BYTES, ENVELOPE_BYTES, capResult, capText } from './cap.js';

/** Longest search query accepted. */
const MAX_QUERY_LENGTH = 200;

/** Longest markup `validate_markup` parses (characters). */
const MAX_MARKUP_LENGTH = 200_000;

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

/** @typedef {import('@modelcontextprotocol/server').CallToolResult} CallToolResult */

/**
 * Result builders bound to a size cap (R4): every tool result and resource text goes through one.
 * @typedef {object} Cap
 * @property {(structured: Record<string, unknown>, text?: string) => CallToolResult} result Readable text plus the same data as structured content.
 * @property {(text: string) => CallToolResult} failure A tool error.
 * @property {(text: string) => string} text Resource text, cut to the cap.
 */

/**
 * @param {number} maxBytes
 * @returns {Cap}
 */
function createCap(maxBytes) {
  return {
    result: (structured, text = JSON.stringify(structured, null, 2)) =>
      capResult({ content: [{ type: 'text', text }], structuredContent: structured }, maxBytes - ENVELOPE_BYTES),
    failure: (text) => capResult({ isError: true, content: [{ type: 'text', text }] }, maxBytes - ENVELOPE_BYTES),
    text: (text) => capText(text, maxBytes - ENVELOPE_BYTES),
  };
}

/**
 * The list_components tool.
 * @param {McpServer} server
 * @param {Cap} cap
 */
function registerListComponents(server, cap) {
  server.registerTool(
    'list_components',
    {
      title: 'List Focsd components',
      description: `List Focsd components (tag, name, category, one-line summary). Optionally filter by category: ${categories().join(', ')}.`,
      inputSchema: z.object({
        category: z.string().max(MAX_QUERY_LENGTH).optional().describe('Category to filter by, e.g. "Forms" or "Overlays".'),
      }),
      annotations: READ_ONLY,
    },
    async ({ category }) => {
      const components = listComponents({ category });

      return cap.result({ count: components.length, components });
    },
  );
}

/**
 * The search_components tool.
 * @param {McpServer} server
 * @param {Cap} cap
 */
function registerSearchComponents(server, cap) {
  server.registerTool(
    'search_components',
    {
      title: 'Search Focsd components',
      description:
        'Find components for a need in plain words ("dropdown with search", "draggable card", "table with filters"). Returns the best matches first.',
      inputSchema: z.object({
        query: z.string().min(1).max(MAX_QUERY_LENGTH).describe('What the UI needs to do.'),
        limit: z.number().int().min(1).max(20).optional().describe(`Maximum results (default ${DEFAULT_SEARCH_LIMIT}).`),
      }),
      annotations: READ_ONLY,
    },
    async ({ query, limit }) => {
      const matches = searchComponents(query, { limit });

      return cap.result({ query, matches });
    },
  );
}

/**
 * The get_component tool.
 * @param {McpServer} server
 * @param {Cap} cap
 */
function registerGetComponent(server, cap) {
  server.registerTool(
    'get_component',
    {
      title: 'Get a Focsd component',
      description:
        'Full reference for one component: import, attributes, properties, methods, events, slots, CSS parts, an example, accessibility notes and keyboard support. Accepts "focsd-select", "select" or "FocsdSelect".',
      inputSchema: z.object({ tag: z.string().min(1).max(MAX_QUERY_LENGTH).describe('Element tag, short name or class name.') }),
      annotations: READ_ONLY,
    },
    async ({ tag }) => {
      const component = getComponent(tag);

      if (!component)
        return cap.failure(`No Focsd component "${tag}". Closest: ${suggestTags(tag).join(', ')}. Use search_components to find one.`);

      return cap.result(component, componentMarkdown(component));
    },
  );
}

/**
 * The get_tokens tool.
 * @param {McpServer} server
 * @param {Cap} cap
 */
function registerGetTokens(server, cap) {
  server.registerTool(
    'get_tokens',
    {
      title: 'Get Focsd design tokens',
      description:
        'Design tokens (CSS custom properties such as --focsd-action, --focsd-space-3, --focsd-radius-control) with their values in a theme. Filter by part of the name.',
      inputSchema: z.object({
        filter: z.string().max(MAX_QUERY_LENGTH).optional().describe('Part of the token name, e.g. "action", "space", "radius", "text".'),
        theme: z.enum(themes).optional().describe('Theme (default light).'),
      }),
      annotations: READ_ONLY,
    },
    async ({ filter, theme }) => {
      const tokens = getTokens({ filter, theme });

      return cap.result({ theme: theme ?? 'light', count: tokens.length, tokens });
    },
  );
}

/**
 * The get_setup tool.
 * @param {McpServer} server
 * @param {Cap} cap
 */
function registerGetSetup(server, cap) {
  server.registerTool(
    'get_setup',
    {
      title: 'Set up Focsd',
      description: 'Install command and a minimal working example for a framework.',
      inputSchema: z.object({ framework: z.enum(FRAMEWORKS).optional().describe('Framework (default html).') }),
      annotations: READ_ONLY,
    },
    async ({ framework }) => {
      const setup = getSetup(framework);

      return cap.result(
        setup,
        `# ${setup.framework}\n\n\`\`\`sh\n${setup.install}\n\`\`\`\n\n\`\`\`\n${setup.usage}\n\`\`\`\n\n${setup.notes.map((n) => `- ${n}`).join('\n')}`,
      );
    },
  );
}

/**
 * The validate_markup tool.
 * @param {McpServer} server
 * @param {Cap} cap
 */
function registerValidateMarkup(server, cap) {
  server.registerTool(
    'validate_markup',
    {
      title: 'Check Focsd markup',
      description:
        'Check HTML or a framework template that uses Focsd: unknown <focsd-*> elements (with suggestions), unknown attributes, and form controls or icon buttons without an accessible name. Returns an empty list when everything is fine.',
      inputSchema: z.object({ html: z.string().max(MAX_MARKUP_LENGTH).describe('The markup to check.') }),
      annotations: READ_ONLY,
    },
    async ({ html }) => {
      const issues = validateMarkup(html);

      return cap.result(
        { valid: issues.length === 0, issues },
        issues.length ? issues.map((i) => `- ${i.line ? `line ${i.line}: ` : ''}${i.message}`).join('\n') : 'No issues found.',
      );
    },
  );
}

/**
 * The focsd://components/{tag} resources.
 * @param {McpServer} server
 * @param {Cap} cap
 */
function registerComponentResource(server, cap) {
  server.registerResource(
    'component',
    new ResourceTemplate('focsd://components/{tag}', {
      list: async () => ({
        resources: listComponents().map((c) => ({
          uri: `focsd://components/${c.tag}`,
          name: c.tag,
          title: c.name,
          description: c.summary,
          mimeType: 'text/markdown',
        })),
      }),
    }),
    { title: 'Focsd component reference', description: 'Markdown reference for one Focsd component.', mimeType: 'text/markdown' },
    async (uri, { tag }) => {
      if (tag === undefined) throw new Error('The component tag is missing.');

      if (tag.length > MAX_QUERY_LENGTH) throw new Error(`Component tag is over ${MAX_QUERY_LENGTH} characters.`);
      const component = getComponent(tag);

      // Invalid params (-32602), as the spec asks for an unknown resource, not an internal error.
      if (!component) throw new ResourceNotFoundError(uri.href);

      return { contents: [{ uri: uri.href, mimeType: 'text/markdown', text: cap.text(componentMarkdown(component)) }] };
    },
  );
}

/**
 * The focsd://tokens resource.
 * @param {McpServer} server
 * @param {Cap} cap
 */
function registerTokensResource(server, cap) {
  server.registerResource(
    'tokens',
    'focsd://tokens',
    {
      title: 'Focsd design tokens',
      description: 'Every design token with its light, dark and contrast values.',
      mimeType: 'text/markdown',
    },
    async (uri) => {
      const light = getTokens();
      const dark = new Map(getTokens({ theme: 'dark' }).map((t) => [t.name, t.value]));
      const contrast = new Map(getTokens({ theme: 'contrast' }).map((t) => [t.name, t.value]));
      const rows = light.map((t) => `| \`${t.css}\` | ${t.value} | ${dark.get(t.name)} | ${contrast.get(t.name)} |`);
      const text = ['# Focsd design tokens', '', '| Token | Light | Dark | Contrast |', '| --- | --- | --- | --- |', ...rows].join('\n');

      return { contents: [{ uri: uri.href, mimeType: 'text/markdown', text: cap.text(text) }] };
    },
  );
}

/**
 * @typedef {object} ServerOptions
 * @property {number} [maxResultBytes] Largest tool result or resource text in bytes, JSON-RPC envelope included (default 65 536). Larger results are truncated and marked `truncated: true`.
 */

/**
 * The Focsd MCP server, with every tool and resource registered.
 * @param {ServerOptions} [options]
 */
export function createServer(options = {}) {
  const { maxResultBytes = DEFAULT_MAX_RESULT_BYTES } = options;

  if (!Number.isFinite(maxResultBytes) || maxResultBytes <= ENVELOPE_BYTES)
    throw new RangeError(`maxResultBytes must be over ${ENVELOPE_BYTES}, got ${maxResultBytes}.`);

  const cap = createCap(maxResultBytes);

  const server = new McpServer(
    { name: 'focsd', title: 'Focsd', version },
    {
      instructions: [
        'Focsd is an accessible (WCAG 2.2 AA), framework-agnostic web component library. Elements use the focsd- prefix (<focsd-button>, <focsd-select>), are form-associated, and are themed with --focsd-* CSS custom properties.',
        'Before writing UI with Focsd: use search_components or list_components to pick elements, get_component for the exact attributes, events, slots and example, and get_setup for the framework. After writing markup, run validate_markup and fix every issue.',
        'Always give form controls a label, prefer real <form> elements, and do not re-create components that exist (dialogs, selects, menus, date pickers, data grid).',
      ].join('\n'),
    },
  );

  registerListComponents(server, cap);
  registerSearchComponents(server, cap);
  registerGetComponent(server, cap);
  registerGetTokens(server, cap);
  registerGetSetup(server, cap);
  registerValidateMarkup(server, cap);
  registerComponentResource(server, cap);
  registerTokensResource(server, cap);

  return server;
}
