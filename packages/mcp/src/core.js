/**
 * Focsd catalog core: pure lookups and a markup checker over the bundled data (data/focsd.json).
 * No Node or MCP APIs, so the docs site can run the same tools in the browser (WebMCP).
 */
import { parseFragment } from 'parse5';

/**
 * @typedef {{ name: string, description: string }} Named
 * @typedef {Named & { type: string, default?: string, property?: string }} Attribute
 * @typedef {Named & { type: string, readonly?: boolean }} Property
 * @typedef {object} Component
 * @property {string} tag
 * @property {string} name
 * @property {string} category
 * @property {string} pattern
 * @property {string | null} [partOf]
 * @property {string} package
 * @property {string} import
 * @property {string} className
 * @property {string} summary
 * @property {string} description
 * @property {Attribute[]} attributes
 * @property {Property[]} properties
 * @property {Named[]} methods
 * @property {Named[]} events
 * @property {Named[]} slots
 * @property {Named[]} cssParts
 * @property {Named[]} [cssProperties]
 * @property {string} [example]
 * @property {string[]} a11y
 * @property {[string, string][]} keyboard
 * @typedef {'light' | 'dark' | 'contrast'} Theme
 * @typedef {{ name: string, css: string, values: Partial<Record<Theme, string>> & { light: string } }} Token
 * @typedef {{ version: string, components: Component[], tokens: Token[] }} CatalogData
 * @typedef {Pick<Component, 'tag' | 'name' | 'category' | 'summary' | 'package' | 'partOf'>} ComponentBrief
 * @typedef {{ code: 'unknown-element' | 'unknown-attribute' | 'missing-label', tag: string, attribute?: string, line?: number, message: string }} MarkupIssue
 * @typedef {{ usage: string, extra?: string }} Setup
 * @typedef {{ tagName?: string, attrs?: { name: string, value: string }[], childNodes?: MarkupNode[], content?: MarkupNode, sourceCodeLocation?: { startLine: number } | null }} MarkupNode
 */

/** Search scoring: what a query term earns when it appears in each field of a component. */
const SCORE = Object.freeze({ name: 6, synonym: 5, phrase: 6, summary: 2, pattern: 1, attribute: 1, partOf: -2 });

/** How many matches `searchComponents` returns when no limit is given. */
export const DEFAULT_SEARCH_LIMIT = 8;

/** The most issues `validateMarkup` reports: enough to fix a page, without a slow, huge answer. */
export const MAX_ISSUES = 1000;

/** How many closest tags `suggestTags` returns when no limit is given. */
const DEFAULT_SUGGESTIONS = 3;

/**
 * Accept `focsd-select`, `select`, `<focsd-select>` or `FocsdSelect`.
 * @param {unknown} input
 * @returns {string}
 */
function normalizeTag(input) {
  const raw = String(input ?? '')
    .trim()
    .replaceAll(/^<|\/?>$/g, '');

  if (/^Focsd[A-Z]/.test(raw))
    return `focsd-${raw
      .slice('Focsd'.length)
      .replaceAll(/([a-z0-9])([A-Z])/g, '$1-$2')
      .toLowerCase()}`;
  const lower = raw.toLowerCase();

  return lower.startsWith('focsd-') ? lower : `focsd-${lower}`;
}

/**
 * Short summary of a component for lists.
 * @param {Component} component
 * @returns {ComponentBrief}
 */
const brief = ({ tag, name, category, summary, package: pkg, partOf }) => {
  /** @type {ComponentBrief} */
  const out = { tag, name, category, summary, package: pkg };

  if (partOf) out.partOf = partOf;

  return out;
};

/**
 * Words people use for a component that its name does not contain.
 * @type {Record<string, string[]>}
 */
const SYNONYMS = {
  'focsd-select': ['dropdown', 'picker', 'choose', 'options'],
  'focsd-combobox': ['autocomplete', 'typeahead', 'dropdown', 'search select'],
  'focsd-multi-select': ['tags input', 'chips', 'multiple', 'dropdown'],
  'focsd-menu': ['dropdown', 'actions menu', 'kebab', 'overflow'],
  'focsd-dialog': ['modal', 'popup', 'lightbox'],
  'focsd-drawer': ['sheet', 'side panel', 'off-canvas'],
  'focsd-floating-panel': ['draggable', 'floating card', 'movable', 'window', 'widget'],
  'focsd-toaster': ['toast', 'snackbar', 'notification'],
  'focsd-alert': ['banner', 'callout', 'message'],
  'focsd-data-grid': ['table', 'spreadsheet', 'sorting', 'filters', 'pagination', 'datatable'],
  'focsd-table': ['table'],
  'focsd-tooltip': ['hint', 'hover text'],
  'focsd-switch': ['toggle'],
  'focsd-tabs': ['tab bar'],
  'focsd-accordion': ['collapse', 'expand'],
  'focsd-chart': ['graph', 'plot', 'bar chart', 'line chart', 'pie', 'donut'],
  'focsd-rich-text': ['wysiwyg', 'editor', 'markdown'],
  'focsd-date-picker': ['calendar', 'date'],
  'focsd-command': ['command palette', 'spotlight', 'cmd k'],
  'focsd-card': ['tile', 'panel'],
};

/** @param {string} s */
const words = (s) =>
  s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1);

/**
 * How well a component matches a query: its name, synonyms, summary, pattern and attributes.
 * @param {Component} c
 * @param {string} q The lower-cased query.
 * @param {string[]} terms The words of the query.
 */
function scoreComponent(c, q, terms) {
  const synonyms = SYNONYMS[c.tag] ?? [];
  const synonymText = synonyms.join(' ');
  let score = c.partOf ? SCORE.partOf : 0;

  for (const term of terms) {
    if (c.tag.includes(term) || c.name.toLowerCase().includes(term)) score += SCORE.name;

    if (synonymText.includes(term)) score += SCORE.synonym;

    if (c.summary.toLowerCase().includes(term)) score += SCORE.summary;

    if (c.pattern.toLowerCase().includes(term) || c.category.toLowerCase() === term) score += SCORE.pattern;

    if (c.attributes.some((a) => a.name === term)) score += SCORE.attribute;
  }

  for (const phrase of synonyms) if (phrase.includes(' ') && q.includes(phrase)) score += SCORE.phrase;

  return score;
}

/**
 * Edit distance, for "did you mean".
 * @param {string} a
 * @param {string} b
 */
function distance(a, b) {
  // One row of the edit-distance table, rewritten in place for each character of `a`; the cells to
  // the left and up-left are carried in variables, so only the cell above is read from the row.
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  let left = b.length;

  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = i - 1;
    left = i;
    row[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      const above = row[j] ?? j;
      const next = Math.min(above + 1, left + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
      left = next;
      row[j] = next;
    }
  }

  return left;
}

const IMPORTS = "import '@focsd-dev/tokens/tokens.css';\nimport '@focsd-dev/tokens/fonts.css';\nimport '@focsd-dev/components';";

/** @type {Record<Framework, Setup>} */
const SETUP = {
  html: {
    usage: `<!-- Load the tokens once, then the components (or one file per component, e.g. @focsd-dev/components/focsd-button.js). -->
<script type="module">
${IMPORTS}
</script>

<focsd-button variant="action">Save</focsd-button>`,
  },
  react: {
    usage: `// React 19 renders custom elements directly. For typed props:
//   import type {} from '@focsd-dev/components/react';
${IMPORTS}

function Save() {
  return <focsd-button variant="action" onClick={() => console.log('saved')}>Save</focsd-button>;
}
// Or the wrappers: import { Button } from '@focsd-dev/react';
// (one element only: import { Button } from '@focsd-dev/react/button';)`,
    extra: '@focsd-dev/react',
  },
  vue: {
    usage: `// vite.config: vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('focsd-') } } })
// Types: import type {} from '@focsd-dev/components/vue';
${IMPORTS}

<template>
  <focsd-button variant="action" @click="save">Save</focsd-button>
</template>`,
  },
  svelte: {
    usage: `<!-- Types: import type {} from '@focsd-dev/components/svelte'; -->
<script>
${IMPORTS}
</script>

<focsd-button variant="action" onclick={save}>Save</focsd-button>`,
  },
  angular: {
    usage: `// Add CUSTOM_ELEMENTS_SCHEMA to the component (or module) that uses focsd-* tags.
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
${IMPORTS}

@Component({
  selector: 'app-save',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: '<focsd-button variant="action" (click)="save()">Save</focsd-button>',
})
export class SaveComponent {}`,
  },
};

/** The frameworks `getSetup` knows. */
export const FRAMEWORKS = /** @type {const} */ (['html', 'react', 'vue', 'svelte', 'angular']);

/** @typedef {(typeof FRAMEWORKS)[number]} Framework */

/**
 * @param {unknown} name
 * @returns {name is Framework}
 */
const isFramework = (name) => /** @type {readonly unknown[]} */ (FRAMEWORKS).includes(name);

/**
 * Install command and a minimal usage example for a framework. A name that is not a framework
 * gets the plain HTML setup (callers outside the type system, such as JSON, can pass anything).
 * @param {Framework} [framework]
 */
function getSetup(framework = 'html') {
  const name = isFramework(framework) ? framework : 'html';
  const setup = SETUP[name];
  const packages = ['@focsd-dev/components', '@focsd-dev/tokens', setup.extra].filter(Boolean).join(' ');

  return {
    framework: name,
    install: `npm install ${packages}`,
    usage: setup.usage,
    notes: [
      'Forms: every input is form-associated, so it submits, validates and resets with a native <form>.',
      'Themes: set data-focsd-theme="light|dark|contrast" on <html> or any element; density with data-focsd-density="default|comfortable|compact".',
      'Optional packages: @focsd-dev/data-grid, @focsd-dev/charts, @focsd-dev/editor.',
    ],
  };
}

const GLOBAL_ATTRIBUTES = new Set([
  'id',
  'class',
  'style',
  'slot',
  'hidden',
  'title',
  'lang',
  'dir',
  'tabindex',
  'role',
  'part',
  'exportparts',
  'inert',
  'autofocus',
  'translate',
  'popover',
  'is',
  'key',
  'ref',
  // JSX spellings (parse5 lower-cases attribute names).
  'classname',
  'htmlfor',
]);

/**
 * Components that need an accessible name (from `label`, `aria-label` or `aria-labelledby`).
 * @param {Component} c
 */
const NEEDS_LABEL = (c) =>
  (c.category === 'Forms' && c.attributes.some((a) => a.name === 'label') && !c.partOf) ||
  ['focsd-icon-button', 'focsd-data-grid', 'focsd-chart', 'focsd-floating-panel', 'focsd-splitter'].includes(c.tag);

/** @param {string} name */
const isFrameworkBinding = (name) => /[^a-z0-9-]/.test(name) || /^(v-|on|bind|x-|hx-)/.test(name);

/**
 * @param {MarkupNode} node
 * @param {(node: MarkupNode) => void} visit
 */
function walk(node, visit) {
  for (const child of node.childNodes ?? []) {
    visit(child);
    walk(child.content ?? child, visit);
  }
}

/**
 * Problems with one <focsd-*> element: unknown element, unknown attributes, a missing name.
 * @param {MarkupNode} node
 * @param {Map<string, Component>} byTag
 * @param {(tag: string) => string[]} suggest
 * @returns {MarkupIssue[]}
 */
function elementIssues(node, byTag, suggest) {
  const tag = /** @type {string} */ (node.tagName);
  const c = byTag.get(tag);
  const line = node.sourceCodeLocation?.startLine;

  if (!c) {
    const alternatives = suggest(tag).map((t) => `<${t}>`);

    return [{ code: 'unknown-element', tag, line, message: `<${tag}> is not a Focsd element. Did you mean ${alternatives.join(', ')}?` }];
  }

  return [...attributeIssues(c, node, line), ...labelIssues(c, node, line)];
}

/**
 * Attributes a known element does not have.
 * @param {Component} c
 * @param {MarkupNode} node
 * @param {number | undefined} line
 * @returns {MarkupIssue[]}
 */
function attributeIssues(c, node, line) {
  const known = new Set(c.attributes.map((a) => a.name));
  // JSX camelCase props (allowCustom) arrive lower-cased: compare without hyphens too.
  const loose = new Set(c.attributes.map((a) => a.name.replaceAll('-', '')));

  const allowed = (/** @type {string} */ name) =>
    known.has(name) ||
    loose.has(name) ||
    GLOBAL_ATTRIBUTES.has(name) ||
    name.startsWith('aria-') ||
    name.startsWith('data-') ||
    isFrameworkBinding(name);

  return (node.attrs ?? [])
    .filter(({ name }) => !allowed(name))
    .map(({ name }) => ({
      code: /** @type {const} */ ('unknown-attribute'),
      tag: c.tag,
      attribute: name,
      line,
      message: `<${c.tag}> has no "${name}" attribute. Known attributes: ${[...known].join(', ') || 'none'}.`,
    }));
}

/**
 * A control that needs an accessible name and has none.
 * @param {Component} c
 * @param {MarkupNode} node
 * @param {number | undefined} line
 * @returns {MarkupIssue[]}
 */
function labelIssues(c, node, line) {
  const attrs = node.attrs ?? [];
  const has = (/** @type {string} */ n) => attrs.some((a) => a.name === n && a.value.trim());

  if (!NEEDS_LABEL(c) || has('label') || has('aria-label') || has('aria-labelledby')) return [];

  return [
    {
      code: 'missing-label',
      tag: c.tag,
      line,
      message: `<${c.tag}> needs an accessible name: add label="…" (or aria-label / aria-labelledby).`,
    },
  ];
}

/**
 * Markdown reference for a component (resources and get_component).
 * @param {Component} c
 */
function componentMarkdown(c) {
  /**
   * @param {string[][]} rows
   * @param {string[]} cols
   */
  const table = (rows, cols) =>
    rows.length
      ? [`| ${cols.join(' | ')} |`, `| ${cols.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n')
      : '_None._';

  /** @param {unknown} s */
  const esc = (s) => String(s ?? '').replaceAll('|', '\\|');

  return [
    `# ${c.name} (\`<${c.tag}>\`)`,
    c.summary,
    `**Package:** \`${c.package}\` · **Import:** \`${c.import}\` · **Category:** ${c.category}${c.pattern ? ` · **Pattern:** ${c.pattern}` : ''}${c.partOf ? ` · Part of \`<${c.partOf}>\`` : ''}`,
    c.example ? `## Example\n\n\`\`\`html\n${c.example}\n\`\`\`` : '',
    `## Attributes\n\n${table(
      c.attributes.map((a) => [`\`${a.name}\``, esc(a.type), esc(a.default ?? ''), esc(a.description)]),
      ['Attribute', 'Type', 'Default', 'Description'],
    )}`,
    c.properties.length
      ? `## Properties\n\n${table(
          c.properties.map((p) => [`\`${p.name}\``, esc(p.type), esc(p.description)]),
          ['Property', 'Type', 'Description'],
        )}`
      : '',
    c.methods.length
      ? `## Methods\n\n${table(
          c.methods.map((m) => [`\`${m.name}()\``, esc(m.description)]),
          ['Method', 'Description'],
        )}`
      : '',
    `## Events\n\n${table(
      c.events.map((e) => [`\`${e.name}\``, esc(e.description)]),
      ['Event', 'Description'],
    )}`,
    `## Slots\n\n${table(
      c.slots.map((s) => [`\`${s.name}\``, esc(s.description)]),
      ['Slot', 'Description'],
    )}`,
    `## CSS parts\n\n${table(
      c.cssParts.map((p) => [`\`${p.name}\``, esc(p.description)]),
      ['Part', 'Description'],
    )}`,
    c.a11y.length ? `## Accessibility\n\n${c.a11y.map((n) => `- ${n}`).join('\n')}` : '',
    c.keyboard.length
      ? `## Keyboard\n\n${table(
          c.keyboard.map(([k, v]) => [esc(k), esc(v)]),
          ['Key', 'Action'],
        )}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Bind every lookup to one data set.
 * @param {CatalogData} data
 */
export function createCatalog(data) {
  const byTag = new Map(data.components.map((c) => [c.tag, c]));

  /**
   * Every component, optionally in one category (Actions, Forms, Overlays, Navigation, Data, …).
   * @param {{ category?: string }} [options]
   */
  function listComponents({ category } = {}) {
    const wanted = category?.toLowerCase();

    return data.components.filter((c) => !wanted || c.category.toLowerCase() === wanted).map(brief);
  }

  /** The categories in use. */
  const categories = () => [...new Set(data.components.map((c) => c.category))].toSorted();

  /**
   * Components ranked for a free-text query (name, tag, summary, pattern and common synonyms).
   * @param {string} query
   * @param {{ limit?: number }} [options]
   */
  function searchComponents(query, { limit = DEFAULT_SEARCH_LIMIT } = {}) {
    const q = String(query ?? '').toLowerCase();
    const terms = words(q);

    return data.components
      .map((c) => ({ c, score: scoreComponent(c, q, terms) }))
      .filter((s) => s.score > 0)
      .toSorted((a, b) => b.score - a.score || a.c.tag.localeCompare(b.c.tag))
      .slice(0, limit)
      .map((s) => brief(s.c));
  }

  /**
   * Full reference for one component, or null.
   * @param {unknown} input
   * @returns {Component | null}
   */
  const getComponent = (input) => byTag.get(normalizeTag(input)) ?? null;

  /**
   * Closest known tags to an unknown one.
   * @param {unknown} input
   * @returns {string[]}
   */
  function suggestTags(input, limit = DEFAULT_SUGGESTIONS) {
    const tag = normalizeTag(input);

    return [...byTag.keys()]
      .map((t) => /** @type {[string, number]} */ ([t, distance(tag, t)]))
      .toSorted((a, b) => a[1] - b[1])
      .slice(0, limit)
      .map(([t]) => t);
  }

  /**
   * Design tokens (CSS custom properties) for a theme, optionally filtered by name.
   * @param {{ filter?: string, theme?: Theme }} [options]
   */
  function getTokens({ filter, theme = 'light' } = {}) {
    const f = filter?.toLowerCase();

    return data.tokens
      .filter((t) => !f || t.name.includes(f))
      .map((t) => ({ name: t.name, css: t.css, value: Object.hasOwn(t.values, theme) ? t.values[theme] : t.values.light }));
  }

  /**
   * Check HTML (or JSX/Vue/Svelte templates) that uses Focsd: unknown focsd-* elements, unknown
   * attributes on known ones, and controls with no accessible name.
   * @param {unknown} html
   * @returns {MarkupIssue[]}
   */
  function validateMarkup(html) {
    /** @type {MarkupIssue[]} */
    const issues = [];

    const fragment = /** @type {MarkupNode} */ (
      /** @type {unknown} */ (parseFragment(String(html ?? ''), { sourceCodeLocationInfo: true }))
    );

    // The same unknown tag is usually repeated: work out its suggestions once per call.
    /** @type {Map<string, string[]>} */
    const suggestions = new Map();
    const suggest = (/** @type {string} */ tag) => suggestions.get(tag) ?? suggestions.set(tag, suggestTags(tag)).get(tag) ?? [];

    walk(fragment, (node) => {
      if (issues.length < MAX_ISSUES && node.tagName?.startsWith('focsd-')) issues.push(...elementIssues(node, byTag, suggest));
    });

    return issues.slice(0, MAX_ISSUES);
  }

  return {
    version: data.version,
    normalizeTag,
    listComponents,
    categories,
    searchComponents,
    getComponent,
    suggestTags,
    getTokens,
    getSetup,
    FRAMEWORKS,
    validateMarkup,
    componentMarkdown,
  };
}
