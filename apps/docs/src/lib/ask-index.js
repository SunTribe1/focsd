/**
 * The "Ask the docs" index: one small JSON file the bot fetches when it opens, built from the same
 * agent data as /llms.txt and /schema/components/*.json (the MCP catalog) plus the guide pages.
 * Pure functions of their inputs, so they are unit tested (test/ask-index.test.mjs).
 */

/**
 * @typedef {object} AskEntry
 * @property {'component' | 'guide'} kind
 * @property {string} name Display name, e.g. "Data grid" or "Theming and tokens".
 * @property {string} [tag] Custom element name for components.
 * @property {string} summary One or two sentences.
 * @property {string[]} keywords Lower-case words and phrases people use for it.
 * @property {string[]} [aliases] Words that count as much as the name (a guide's main subject).
 * @property {string} url Docs page, site-relative.
 * @property {string} [example] A short markup or code example.
 * @property {string} [lang] Language of the example for the code fence.
 */

/** The longest example kept, so the index stays small; longer ones are cut at an element boundary. */
const MAX_EXAMPLE = 520;

/**
 * Words people use for a component that its name and summary do not contain. Extends the MCP
 * catalog's synonyms with the questions the landing page suggests.
 * @type {Record<string, string[]>}
 */
const COMPONENT_KEYWORDS = {
  'focsd-select': ['dropdown', 'picker', 'choose', 'options'],
  'focsd-combobox': ['autocomplete', 'typeahead', 'dropdown', 'search select'],
  'focsd-multi-select': ['tags input', 'chips', 'multiple', 'dropdown'],
  'focsd-menu': ['dropdown', 'actions menu', 'kebab', 'overflow'],
  'focsd-dialog': ['modal', 'popup', 'lightbox', 'confirm'],
  'focsd-drawer': ['sheet', 'side panel', 'off-canvas'],
  'focsd-floating-panel': ['draggable', 'floating card', 'movable', 'window', 'widget'],
  'focsd-toaster': ['toast', 'snackbar', 'notification'],
  'focsd-alert': ['banner', 'callout', 'message'],
  'focsd-data-grid': ['table', 'spreadsheet', 'sorting', 'sort', 'filter', 'filters', 'pagination', 'datatable', 'grid', 'rows'],
  'focsd-table': ['table'],
  'focsd-tooltip': ['hint', 'hover text'],
  'focsd-switch': ['toggle'],
  'focsd-tabs': ['tab bar'],
  'focsd-accordion': ['collapse', 'expand'],
  'focsd-chart': ['graph', 'plot', 'bar chart', 'line chart', 'pie', 'donut', 'charts'],
  'focsd-rich-text': ['wysiwyg', 'editor', 'markdown', 'rich text'],
  'focsd-date-picker': ['calendar', 'date'],
  'focsd-date-range-picker': ['calendar', 'date range', 'dates'],
  'focsd-command': ['command palette', 'spotlight', 'cmd k', 'ctrl k'],
  'focsd-card': ['tile', 'panel'],
  'focsd-error-summary': ['validation', 'errors', 'form errors', 'validate'],
  'focsd-text-field': ['input', 'text input', 'form field', 'validation'],
  'focsd-theme-toggle': ['dark mode', 'light mode', 'theme switch'],
  'focsd-theme-picker': ['brand', 'preset', 'presets'],
  'focsd-notification-center': ['notifications', 'inbox', 'bell'],
  'focsd-chat-thread': ['chat', 'ai', 'llm', 'conversation', 'chatbot'],
  'focsd-composer': ['chat input', 'prompt'],
};

/**
 * Guide topics: the pages that answer "how do I" questions, with the words people ask them in and a
 * short snippet. `slug` must be a docs page (src/data/sidebar.js).
 * @type {{ slug: string, keywords: string[], aliases?: string[], example?: string, lang?: string }[]}
 */
const GUIDE_TOPICS = [
  {
    slug: 'getting-started/installation',
    aliases: ['install', 'installation'],
    keywords: ['install', 'installation', 'npm', 'pnpm', 'setup', 'start', 'getting started', 'bundler', 'cdn'],
    example: `npm i @focsd/components @focsd/tokens\n\n// In your app entry\nimport '@focsd/tokens/tokens.css';\nimport '@focsd/components';`,
    lang: 'js',
  },
  {
    slug: 'getting-started/frameworks',
    aliases: ['react', 'vue', 'angular', 'svelte', 'framework'],
    keywords: ['react', 'vue', 'angular', 'svelte', 'framework', 'frameworks', 'nextjs', 'next', 'jsx', 'typescript', 'ssr'],
    example: `// React 19 renders custom elements directly\nimport '@focsd/components';\n\nexport function Settings() {\n  return <focsd-text-field label="Workspace name" required></focsd-text-field>;\n}\n\n// Or the typed wrappers: import { TextField } from '@focsd/react';`,
    lang: 'jsx',
  },
  {
    slug: 'getting-started/forms',
    aliases: ['form', 'forms', 'validation'],
    keywords: ['form', 'forms', 'validation', 'validate', 'formdata', 'submit', 'required', 'error', 'errors', 'reset'],
    example: `<form novalidate>\n  <focsd-error-summary></focsd-error-summary>\n  <focsd-text-field name="email" type="email" label="Work email" required></focsd-text-field>\n  <focsd-button type="submit" variant="action">Create account</focsd-button>\n</form>`,
    lang: 'html',
  },
  {
    slug: 'foundations/theming',
    aliases: ['theme', 'theming', 'tokens'],
    keywords: [
      'theme',
      'theming',
      'tokens',
      'design tokens',
      'dark',
      'dark mode',
      'light',
      'colors',
      'color',
      'color',
      'css variables',
      'custom properties',
      'density',
      'figma',
      'brand',
    ],
    example: `/* Your brand on top of the tokens */\n:root {\n  --focsd-action: #0b5cad;\n  --focsd-action-hover: #094c8f;\n  --focsd-radius-control: 6px;\n}`,
    lang: 'css',
  },
  {
    slug: 'foundations/presets',
    keywords: ['preset', 'presets', 'brand', 'harbor', 'signal', 'mineral', 'theme'],
    example: `import '@focsd/tokens/presets.css';\n\n<html data-focsd-brand="harbor">`,
    lang: 'html',
  },
  { slug: 'foundations/theme-builder', keywords: ['theme builder', 'brand colors', 'contrast', 'radius', 'theme', 'customize'] },
  { slug: 'foundations/styling', keywords: ['style', 'styling', 'css', 'parts', 'shadow dom', 'customize', 'override'] },
  { slug: 'foundations/accessibility', keywords: ['accessibility', 'accessible', 'a11y', 'wcag', 'aria', 'screen reader', 'keyboard'] },
  { slug: 'guides/accessibility-conformance', keywords: ['wcag', 'conformance', 'vpat', 'audit', 'compliance'] },
  { slug: 'guides/screen-reader-testing', keywords: ['screen reader', 'nvda', 'voiceover', 'jaws', 'testing'] },
  { slug: 'foundations/icons', keywords: ['icon', 'icons', 'lucide', 'svg'] },
  { slug: 'foundations/localization', keywords: ['localization', 'translate', 'translation', 'i18n', 'language', 'rtl', 'locale'] },
  {
    slug: 'getting-started/ai-assistants',
    keywords: ['mcp', 'ai', 'claude', 'cursor', 'copilot', 'assistant', 'llm', 'agent'],
    example: `npx @focsd/mcp`,
    lang: 'sh',
  },
  { slug: 'guides/agent-ready-sites', keywords: ['webmcp', 'agent', 'agents', 'ai', 'tools'] },
  { slug: 'guides/chat-ui', keywords: ['chat', 'chatbot', 'ai', 'llm', 'streaming', 'assistant', 'conversation'] },
  { slug: 'guides/data-grid', keywords: ['data grid', 'grid', 'table', 'server-side', 'rows', 'columns'] },
  { slug: 'guides/charts', keywords: ['chart', 'charts', 'graph', 'sparkline', 'gauge'] },
  { slug: 'guides/blocks', keywords: ['blocks', 'templates', 'page', 'dashboard', 'sign in', 'settings page', 'cli'] },
  { slug: 'guides/patterns', keywords: ['patterns', 'screens', 'examples', 'layout'] },
  { slug: 'getting-started/own-the-source', keywords: ['cli', 'copy', 'source', 'eject', 'shadcn'] },
  { slug: 'getting-started/browser-support', keywords: ['browser', 'browsers', 'safari', 'firefox', 'chrome', 'support'] },
  { slug: 'guides/keyboard-shortcuts', keywords: ['shortcut', 'shortcuts', 'hotkey', 'keyboard'] },
  { slug: 'guides/troubleshooting', keywords: ['troubleshooting', 'problem', 'error', 'bug', 'not working'] },
  { slug: 'guides/migrate-from-material-web', keywords: ['material', 'migrate', 'migration', 'md-'] },
];

/**
 * Words of a text, lower case, at least two characters.
 * @param {string} text
 */
const wordsOf = (text) => [...new Set(text.toLowerCase().match(/[a-z0-9][a-z0-9-]*[a-z0-9]/g))];

/**
 * A component's example without the docs' layout wrapper (`<div class="full">`, `stack`, `row`),
 * dedented and cut to MAX_EXAMPLE characters at the end of a line.
 * @param {string | undefined} example
 * @returns {string | undefined}
 */
export function shortExample(example) {
  if (!example) return undefined;
  let code = example.trim();
  const wrapped = /^<div class="(?:full|stack|row)">\s*([\s\S]*)<\/div>$/.exec(code);

  if (wrapped?.[1] && !/<div class="(?:full|stack|row)">/.test(wrapped[1])) code = wrapped[1].trim();
  const lines = code.split('\n');
  const indent = Math.min(...lines.slice(1).flatMap((l) => (l.trim() ? [/^ */.exec(l)?.[0].length ?? 0] : [])), Infinity);
  const dedented = Number.isFinite(indent) && indent > 0 ? [lines[0], ...lines.slice(1).map((l) => l.slice(indent))] : lines;
  const kept = [];
  let size = 0;

  for (const line of dedented) {
    if (size + line.length > MAX_EXAMPLE && kept.length) break;
    kept.push(line);
    size += line.length + 1;
  }

  return kept.join('\n');
}

/**
 * The entry for one catalog component, or null for sub-elements and elements without a page
 * (focsd-option and focsd-tab are answered by their parent's page).
 * @param {CatalogComponent} c
 * @param {Set<string>} pages
 * @returns {AskEntry | null}
 */
function componentEntry(c, pages) {
  const slug = c.tag.replace(/^focsd-/, '');

  if (c.partOf || !pages.has(slug)) return null;

  const keywords = [
    ...new Set([...wordsOf(`${c.name} ${slug}`), ...(COMPONENT_KEYWORDS[c.tag] ?? []), ...wordsOf(c.pattern), c.category.toLowerCase()]),
  ];

  /** @type {AskEntry} */
  const entry = { kind: 'component', name: c.name, tag: c.tag, summary: c.summary, keywords, url: `/components/${slug}/` };
  const example = shortExample(c.example);

  if (example) {
    entry.example = example;
    entry.lang = 'html';
  }

  return entry;
}

/**
 * The entry for one guide topic, or null when its page is not in the sidebar.
 * @param {(typeof GUIDE_TOPICS)[number]} topic
 * @param {Map<string, { slug: string, label: string, description: string }>} guideBySlug
 * @returns {AskEntry | null}
 */
function guideEntry(topic, guideBySlug) {
  const page = guideBySlug.get(topic.slug);

  if (!page) return null;

  /** @type {AskEntry} */
  const entry = {
    kind: 'guide',
    name: page.label,
    summary: page.description,
    keywords: [...new Set([...topic.keywords, ...wordsOf(page.label)])],
    url: `/${topic.slug}/`,
  };

  if (topic.aliases) entry.aliases = topic.aliases;

  if (topic.example) {
    entry.example = topic.example;
    entry.lang = topic.lang ?? 'html';
  }

  return entry;
}

/**
 * @typedef {{ tag: string, name: string, category: string, pattern: string, summary: string,
 *   partOf?: string | null, example?: string }} CatalogComponent The fields read from the MCP data.
 * @param {object} input
 * @param {CatalogComponent[]} input.components Every element in the MCP catalog.
 * @param {Set<string>} input.pages Slugs that have a docs page (the catalog's top-level components).
 * @param {{ slug: string, label: string, description: string }[]} input.guides The guide pages.
 * @returns {AskEntry[]}
 */
export function buildAskIndex({ components, pages, guides }) {
  const guideBySlug = new Map(guides.map((g) => [g.slug, g]));
  const fromGuides = GUIDE_TOPICS.flatMap((topic) => guideEntry(topic, guideBySlug) ?? []);
  const fromComponents = components.flatMap((c) => componentEntry(c, pages) ?? []);

  return [...fromGuides, ...fromComponents];
}
