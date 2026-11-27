/**
 * The hand-written sidebar groups. astro.config.mjs renders them as the sidebar and
 * pages/llms.txt.js lists the same pages for AI tools, so a new page is added in one place.
 * Component pages are generated from the catalog (see catalogue.js).
 */

/** @typedef {{ label: string, slug: string }} SidebarPage */
/** @typedef {{ label: string, items: SidebarPage[] }} SidebarGroup */

/** @type {SidebarGroup[]} */
export const GUIDE_GROUPS = [
  {
    label: 'Start here',
    items: [
      { label: 'Installation', slug: 'getting-started/installation' },
      { label: 'Usage in HTML', slug: 'getting-started/usage' },
      { label: 'Frameworks', slug: 'getting-started/frameworks' },
      { label: 'Forms', slug: 'getting-started/forms' },
      { label: 'AI assistants (MCP)', slug: 'getting-started/ai-assistants' },
      { label: 'Hosted MCP', slug: 'getting-started/hosted-mcp' },
      { label: 'Own the source (CLI)', slug: 'getting-started/own-the-source' },
      { label: 'Browser support', slug: 'getting-started/browser-support' },
      { label: 'Versioning and upgrades', slug: 'getting-started/versioning' },
      { label: 'Changelog', slug: 'changelog' },
    ],
  },
  {
    label: 'Foundations',
    items: [
      { label: 'Design language', slug: 'foundations/design-language' },
      { label: 'Theming and tokens', slug: 'foundations/theming' },
      { label: 'Theme presets', slug: 'foundations/presets' },
      { label: 'Theme builder', slug: 'foundations/theme-builder' },
      { label: 'Styling', slug: 'foundations/styling' },
      { label: 'Icons', slug: 'foundations/icons' },
      { label: 'Localization', slug: 'foundations/localization' },
      { label: 'Helpers for app code', slug: 'foundations/utilities' },
      { label: 'Accessibility', slug: 'foundations/accessibility' },
    ],
  },
  {
    label: 'Guides',
    items: [
      { label: 'Data grid', slug: 'guides/data-grid' },
      { label: 'Chat UI (AI kit)', slug: 'guides/chat-ui' },
      { label: 'Charts', slug: 'guides/charts' },
      { label: 'Blocks', slug: 'guides/blocks' },
      { label: 'Patterns', slug: 'guides/patterns' },
      { label: 'Keyboard shortcuts', slug: 'guides/keyboard-shortcuts' },
      { label: 'Choosing a select', slug: 'guides/choosing-a-select' },
      { label: 'Choosing a toggle', slug: 'guides/choosing-a-toggle' },
      { label: 'Agent-ready sites (WebMCP)', slug: 'guides/agent-ready-sites' },
      { label: 'Troubleshooting and recipes', slug: 'guides/troubleshooting' },
      { label: 'Migrating from Material Web', slug: 'guides/migrate-from-material-web' },
      { label: 'Accessibility conformance', slug: 'guides/accessibility-conformance' },
      { label: 'Testing with screen readers', slug: 'guides/screen-reader-testing' },
    ],
  },
];

/**
 * Forms is the largest category, so its sidebar group is split by what the person enters. Every
 * Forms component must be in exactly one subgroup (astro.config.mjs throws otherwise).
 * @type {{ label: string, slugs: string[] }[]}
 */
export const FORM_GROUPS = [
  {
    label: 'Text input',
    slugs: [
      'text-field',
      'textarea',
      'number-field',
      'currency-field',
      'phone-field',
      'password-field',
      'search-field',
      'otp-field',
      'editable',
      'rich-text',
    ],
  },
  {
    label: 'Choice',
    slugs: [
      'checkbox',
      'checkbox-group',
      'radio-group',
      'switch',
      'segmented-control',
      'select',
      'combobox',
      'multi-select',
      'tag-input',
      'listbox',
      'slider',
      'rating',
    ],
  },
  { label: 'Date and time', slugs: ['calendar', 'date-field', 'date-picker', 'date-range-picker', 'date-time-picker', 'time-field'] },
  { label: 'Color, files and signatures', slugs: ['color-picker', 'swatch-picker', 'file-upload', 'signature-pad'] },
  { label: 'Form structure', slugs: ['field', 'fieldset', 'error-summary'] },
];
