<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/brand/logo/svg/focsd-horizontal-offwhite.svg" />
    <img src="docs/brand/logo/svg/focsd-horizontal-ink.svg" alt="Focsd" height="56" />
  </picture>
</h1>

**Free, accessible web components that work everywhere.** 128 components, including a data grid, charts, a rich text editor and an AI chat kit, all MIT licensed, with no paid tier. They are built on web standards, so the same components work in plain HTML, React, Vue, Svelte, Angular and on the server.

[Docs](https://focsd.dev) · [Components](https://focsd.dev/components/) · [Theme builder](https://focsd.dev/foundations/theme-builder/) · [AI assistants (MCP)](https://focsd.dev/getting-started/ai-assistants/)

With a bundler (Vite, webpack, Next.js and the like), after `npm install @focsd/components @focsd/tokens`:

```html
<script type="module">
  import '@focsd/tokens/tokens.css';
  import '@focsd/components';
</script>

<form>
  <focsd-text-field label="Email" name="email" type="email" required></focsd-text-field>
  <focsd-select label="Plan" name="plan">
    <focsd-option value="free">Free</focsd-option>
    <focsd-option value="team">Team</focsd-option>
  </focsd-select>
  <focsd-button type="submit" variant="action">Sign up</focsd-button>
</form>
```

## Why Focsd

- **Accessible by default.** WCAG 2.2 AA, tested with axe in Chromium, Firefox and WebKit, keyboard support from the ARIA Authoring Practices, real focus management, Windows High Contrast and reduced motion.
- **Real form controls.** Every input is form-associated: it submits, validates, resets and restores with a native `<form>`, like built-in inputs.
- **Any framework, no lock-in.** Custom elements with typings for React, Vue, Svelte and JSX, editor autocomplete for VS Code and JetBrains, React wrappers, and server rendering with Lit SSR.
- **Yours to theme.** Design tokens as CSS custom properties, light, dark and high-contrast themes, three densities, CSS parts for every internal piece, Figma variables, and a theme builder that checks contrast.
- **Small.** Tree-shakable per component, with bundle-size budgets enforced in CI.
- **Agent-ready.** An MCP server teaches AI coding assistants the whole library, and `@focsd/webmcp` turns your Focsd forms into WebMCP tools for agents in the browser. `npx focsd init --agent` writes an `AGENTS.md` and a Claude skill into your project, and [`/AGENTS.md`](https://focsd.dev/AGENTS.md), [`/llms.txt`](https://focsd.dev/llms.txt) and per-element contracts (`/components/<tag>.md`) are served by the docs.

## Packages

| Package | What it is |
| --- | --- |
| [`@focsd/components`](packages/components) | The styled components (`<focsd-*>`) |
| [`@focsd/tokens`](packages/tokens) | Design tokens, themes, densities and fonts |
| [`@focsd/primitives`](packages/primitives) | Headless base classes: behavior and accessibility without styles |
| [`@focsd/react`](packages/react) | React wrappers |
| [`@focsd/data-grid`](packages/data-grid) | Sorting, filtering, grouping, editing and virtualized data grid |
| [`@focsd/charts`](packages/charts) | Accessible bar, line, area, stacked, scatter and donut charts with data tables, plus sparklines and gauges |
| [`@focsd/editor`](packages/editor) | Form-associated rich text editor |
| [`@focsd/ai`](packages/ai) | Accessible AI chat UI: thread, composer, streaming markdown, tool calls and a chat controller |
| [`@focsd/mcp`](packages/mcp) | MCP server for AI coding assistants |
| [`@focsd/webmcp`](packages/webmcp) | WebMCP tools from your forms, for agents in the browser |
| [`focsd`](packages/cli) | CLI that copies components into your project so you own their styles |

All packages share one version number; see [VERSIONING.md](VERSIONING.md).

## Browser support

The latest two versions of Chrome, Edge, Firefox and Safari (desktop and mobile). Details, and the platform features Focsd relies on: [focsd.dev/getting-started/browser-support](https://focsd.dev/getting-started/browser-support/).

## Contributing

Bug reports, ideas and pull requests are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md). Report security issues privately as described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE). Bundled icons, fonts and phone data keep their own licenses: see [third-party notices](THIRD_PARTY_NOTICES.md).
