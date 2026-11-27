# Contributing to Focsd

Thanks for helping. Bug reports, accessibility findings, ideas and pull requests are all welcome.

## Before you start

- **Bugs:** open an issue with the component, the browser and assistive technology (if any), what you did, what you expected and what happened. A minimal reproduction (CodePen, StackBlitz or a snippet) helps most.
- **Accessibility issues** are bugs, never feature requests. Tell us the screen reader or input method and what you heard or could not reach.
- **New components or large changes:** open an issue first so we can agree on the API and the ARIA pattern before you write code.

## Development

Requirements: pnpm 11 (`corepack enable` picks the pinned version). pnpm downloads and uses the Node version
the repository pins (`devEngines` in `package.json`, Node 22), so local results match CI whatever Node you have
installed.

```sh
pnpm install
pnpm run playground   # test bench at http://localhost:5174
# Use `pnpm run docs`, not `pnpm docs` (pnpm 11 has a built-in `docs` command).
# If live previews go blank after you rebuild packages, stop the docs server and delete
# apps/docs/node_modules/.vite, then start it again (Vite's pre-bundled modules went stale).
pnpm run docs         # docs site at http://localhost:4321
```

`pnpm install` also installs two Git hooks (husky). **pre-commit** runs ESLint `--fix`, Oxlint and Prettier on the
files you stage (lint-staged, configured in `package.json`); **commit-msg** checks the message with commitlint. They
are skipped in CI and when there is no `.git`.

Before you open a pull request:

```sh
pnpm check                                  # lint, format, spelling, release config, type checks
pnpm check:packages                         # publint and Are the Types Wrong? on the packed packages
pnpm test                                   # unit tests, type tests, bundle-size budgets
pnpm --filter @focsd-dev/playground test:e2e   # browser tests in Chromium, Firefox and WebKit (with axe)
```

`apps/playground` is the **Focsd test bench**: plain pages that load every component in known states so the
end-to-end, accessibility and visual suites have something stable to drive. It is for contributors, not a demo.
Where people browse and try components and themes is the components gallery, `/components/` on the docs site
(`apps/docs`); each card opens the component's page with its live example.

## What a good change looks like

- **Tests first.** Every behavior change comes with a test that failed before the change: Playwright for anything a person does, Vitest for logic.
- **Accessibility.** Follow the [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) pattern for the component, support the keyboard fully, keep axe at zero violations, and check Windows High Contrast and reduced motion.
- **Design tokens only.** Styles use `--focsd-*` tokens, never raw colors or sizes. See [DESIGN.md](DESIGN.md).
- **Headless first.** Behavior lives in `@focsd-dev/primitives`; styles in `@focsd-dev/components`.
- **Changesets.** Run `pnpm changeset`, choose `patch`, `minor` or `major` by the rules in [VERSIONING.md](VERSIONING.md), and describe the change for people using Focsd. Changes that only touch tests, docs or tooling need none.

## Commit messages

Commits and pull request titles follow [Conventional Commits](https://www.conventionalcommits.org), checked by
commitlint (`commitlint.config.js`) in the commit-msg hook and in CI:

```text
type(optional scope): what changed, in the imperative

Optional body: why, and anything a reviewer should know.
```

| Type | For |
| --- | --- |
| `feat` | A new component, attribute, event, token or other capability |
| `fix` | A bug or accessibility fix |
| `docs` | Documentation only |
| `refactor` | Code that changes no behavior |
| `perf` | Faster or smaller |
| `test` | Tests only |
| `build`, `ci`, `chore` | Tooling, workflows, dependencies |

Add `!` after the type (`feat!: …`) or a `BREAKING CHANGE:` footer for a breaking change, and make its changeset a
`major`. Pull requests are squash-merged, so the title becomes the commit on `main`.

## Releases

Versions follow [Semantic Versioning](https://semver.org) ([VERSIONING.md](VERSIONING.md)); every package shares one
version. Maintainers: how releases are published, and the one-time setup, are in [RELEASING.md](RELEASING.md).

## Standards and AI assistants

Focsd follows the [Lit](https://lit.dev/docs/) and [open-wc](https://open-wc.org/guides/) best practices. The rules,
with the reasoning and sources, are written as agent skills in `.claude/skills/` (Lit, open-wc, component authoring,
testing) and two review agents in `.claude/agents/`. They are plain Markdown: read them yourself, or let Claude Code
(or any agent that reads `AGENTS.md`) use them. Ask the `lit-component-reviewer` agent to review your change before
you open a pull request.

## Code of conduct

Everyone taking part follows our [Code of Conduct](CODE_OF_CONDUCT.md).

## Coverage

`pnpm --filter @focsd-dev/playground coverage` runs the end-to-end suite in Chromium with coverage on and checks the floor in `apps/playground/scripts/check-coverage.mjs` (report in `apps/playground/coverage/index.html`). The CLI, MCP and WebMCP packages enforce unit coverage floors in their `vitest.config.mjs`. Raise a floor when coverage rises; never lower one to make a change pass.

## Visual regression

`pnpm --filter @focsd-dev/playground test:visual` compares every playground page, in the light, dark and contrast themes, with the screenshots in `apps/playground/e2e/__screenshots__/<platform>/`. After an intended visual change, update your platform's baselines with `pnpm --filter @focsd-dev/playground exec playwright test --project=visual --update-snapshots`, and run the **Update visual baselines** workflow for the Linux ones CI uses.
