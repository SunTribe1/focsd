---
name: open-wc-standards
description: open-wc (Open Web Components) recommendations for publishing, linting, testing, events and lifecycle, and how Focsd meets each one. Use when changing package.json, exports, the dist build, lint or test tooling, event dispatch, or when preparing the open-wc component library listing.
---

# open-wc standards (Focsd edition)

Distilled from the 13 open-wc guide pages (https://open-wc.org/guides/), checked against Focsd on 2026-11-25.
open-wc follows the practices of its sister project Modern Web (https://modern-web.dev). Where open-wc and Lit
disagree, the Focsd choice is stated.

## Publishing (https://open-wc.org/guides/developing-components/publishing/)

Do:

- Publish the latest standard ECMAScript as **ES modules**; transpile only non-standard syntax (Focsd ships the
  source as written).
- `"main"` and `"module"` point at the same ES module file; `"type": "module"` (Focsd sets all three, plus
  `types`, `exports`, `sideEffects`, `customElements`, `files`).
- **Export element classes** so they can be subclassed and used in scoped registries.
- **Keep side effects apart from the entry point.** Registration (`customElements.define`) is a side effect.
  Focsd: each `@focsd/components/focsd-*.js` module self-defines (Lit's recommendation); the side-effect-free
  classes are at `@focsd/components/classes/focsd-*.js` and the headless bases in `@focsd/primitives`.
- Bare specifiers for dependencies (`import { LitElement } from 'lit'`), file extensions for deep imports
  (`lit/directives/live.js`).
- Optional, all done: typings, source shipped next to `dist/`, a React wrapper (`@focsd/react`, `@lit/react`).

Don't:

- **Don't optimize, bundle or minify.** Focsd's `dist/` is a file-for-file copy of `src/` with nothing minified.
- **Don't use `.mjs`** for published code (MIME issues). Node-only scripts in the repo may use `.mjs`; none ship.
- **Never import polyfills** into modules; they belong in devDependencies for demos and tests.

## Linting and formatting (https://open-wc.org/guides/tools/linting-and-formatting/)

- ESLint + Prettier. open-wc's config bundles `eslint-plugin-wc`, `eslint-plugin-lit`, `eslint-plugin-html` and a
  mocha `.only` guard. Focsd runs its own flat config with `eslint-plugin-lit`, `eslint-plugin-wc` (recommended and
  best-practice) and `eslint-plugin-lit-a11y` on **every package that ships elements**, plus Oxlint, cspell,
  `lit-analyzer` and type checks in `pnpm check`.
- Lint on commit with husky + lint-staged (Focsd: `.husky/pre-commit` runs `lint-staged`).

## Testing (https://open-wc.org/guides/developing-components/testing/)

- open-wc recommends Web Test Runner (real browsers, native ESM). Focsd's equivalent: Playwright in Chromium,
  Firefox and WebKit with axe, plus Vitest in Node for pure logic. See the `focsd-testing` skill.
- Stubbing (https://open-wc.org/guides/knowledge/testing/stubs/): a template binding `@click=${this.fn}` captures
  the method at render, so stubbing it afterwards does nothing. Prefer testing the side effect (event fired,
  property set); otherwise stub, then `requestUpdate()` and `await updateComplete`; an arrow wrapper in the template
  is the last resort.

## Events (https://open-wc.org/guides/knowledge/events/)

- Listen to your own DOM with `@event` in the template; to your own host in the constructor; to window/document in
  `connectedCallback`, removed in `disconnectedCallback`.
- Dispatch plain events; add `bubbles: true` when an ancestor needs it; **refrain from `composed: true`** (event
  pollution). Data: `CustomEvent` `detail` or an `Event` subclass.
- Focsd rule (`docs/events.md`): `focsd-*` events bubble and are never composed; native-named events follow the
  native element (`input` is composed because native `input` is). A guard test scans every dispatch.

## Lifecycle (https://open-wc.org/guides/knowledge/lit-element/lifecycle/)

- Constructor: no DOM, no side effects. `connectedCallback` may run many times: always call `super`, undo work in
  `disconnectedCallback`. Order: constructor → connectedCallback → update → render → firstUpdated → updated.

## Tooling

- Web Component DevTools (browser extension) works with Lit elements out of the box.
- Going without a build step (https://open-wc.org/guides/developing-components/going-buildless/): native modules in
  development; Focsd's playground uses Vite with the `development` condition, which serves source modules as is.

## Getting listed (https://open-wc.org/guides/community/component-libraries/)

- Pull request to `open-wc/open-wc` adding an entry to `docs/_data/componentLibraries.js`. No written criteria; the
  listed libraries are public, documented and published on npm.
- Before submitting: public repository, packages on npm, docs site live, `pnpm check` and all suites green. The
  audit is in `docs/superpowers/specs/2026-11-25-open-wc-lit-audit.md`.
