/** The /llms.txt body (https://llmstxt.org): an index of the docs for AI tools. */
import { GUIDE_GROUPS } from '../data/sidebar.js';

const NAME = 'Focsd';

/**
 * Links to the generated agent files: one Markdown contract and one JSON Schema per element, and
 * the design tokens as DTCG.
 * @param {string[]} tags
 */
function agentFiles(tags) {
  const contract = (/** @type {string} */ tag) =>
    `- [<${tag}>](/components/${tag}.md): JSON Schema [/schema/components/${tag}.json](/schema/components/${tag}.json)`;

  const tokens = ['index', 'light', 'dark', 'contrast'].map((file) => `- [${file}.json](/schema/tokens/${file}.json)`);

  return [
    '## Component contracts',
    '',
    "One Markdown contract per element (usage, attributes, events with detail types, slots, parts, CSS properties, accessibility, do and don't) and a JSON Schema 2020-12 of its attributes.",
    '',
    ...tags.map(contract),
    '',
    '## Design tokens (DTCG)',
    '',
    ...tokens,
    '',
  ];
}

/**
 * @param {object} input
 * @param {string[]} input.categories Category order for the component sections.
 * @param {{ name: string, tag: string, slug: string, category: string }[]} input.components
 * @param {(tag: string) => string} input.summaryOf One-line summary of a component.
 * @param {string[]} [input.contracts] Every element tag with a contract (sub-elements included).
 * @returns {string}
 */
export function llmsIndex({ categories, components, summaryOf, contracts = [] }) {
  const pages = GUIDE_GROUPS.flatMap(({ label, items }) => [`## ${label}`, '', ...items.map((p) => `- [${p.label}](/${p.slug}/)`), '']);

  const byCategory = categories.flatMap((category) => {
    const items = components.filter((c) => c.category === category);

    if (!items.length) return [];

    return [[`## ${category}`, '', ...items.map((c) => `- [${c.name}](/components/${c.slug}/): ${summaryOf(c.tag)}`)].join('\n'), ''];
  });

  return [
    `# ${NAME}`,
    '',
    '> Free (MIT), accessible (WCAG 2.2 AA), framework-agnostic web components. Elements use the focsd- prefix (<focsd-button>), work in HTML, React, Vue, Svelte and Angular, submit with native forms, and are themed with --focsd-* CSS custom properties.',
    '',
    'Full component reference in one file: [llms-full.txt](/llms-full.txt). For AI coding assistants, the MCP server `npx @focsd-dev/mcp` answers the same questions as tools. Project instructions for agents: [AGENTS.md](/AGENTS.md) (`npx focsd init --agent` writes it into your project).',
    '',
    ...pages,
    ...byCategory,
    ...agentFiles(contracts),
  ].join('\n');
}
