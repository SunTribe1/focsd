# Focsd: guidance for AI coding agents

Focsd is a Lit 3 web component library in plain ESM JavaScript with JSDoc. Before changing code, read the skill that
matches the task. They work with any agent (Claude Code loads them automatically from `.claude/`):

| Task | Read |
| --- | --- |
| Any LitElement, template, directive or controller | `.claude/skills/lit-best-practices/SKILL.md` |
| A new component or an API change | `.claude/skills/focsd-component-authoring/SKILL.md` |
| Tests, or a failure in one browser | `.claude/skills/focsd-testing/SKILL.md` |
| package.json, exports, build, lint or test tooling, events | `.claude/skills/open-wc-standards/SKILL.md` |

Review agents: `.claude/agents/lit-component-reviewer.md` (code review against these rules) and
`.claude/agents/open-wc-auditor.md` (packaging and tooling audit).

Also read `DESIGN.md` (tokens and visual rules), `docs/events.md` (event rules) and `CONTRIBUTING.md`. Run
`pnpm check` and the tests before calling work done.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
