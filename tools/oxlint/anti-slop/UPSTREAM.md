# anti-slop (vendored)

- Source: https://github.com/dmmulroy/anti-slop (MIT)
- Commit: 13909c9e07590f5a85d93c62712259fe14a883f7 (copied 2026-10-15 from
  `skills/install-anti-slop/assets/anti-slop` via the install-anti-slop skill's install script)
- Installed paths: `tools/oxlint/anti-slop/` (generic plugin, `index.ts`). The Effect plugin is
  copied but not registered: this project does not depend on Effect.
- Config: `.oxlintrc.json`. Oxlint's default `correctness` category is off because ESLint
  (`eslint.config.js`) already covers it; Oxlint runs only the anti-slop rules and
  `oxc/no-accumulating-spread`.
- Local deviations: none to the rule sources. `.oxlintrc.json` overrides turn off
  `no-runtime-typeof` only in files whose `typeof` checks are the boundary parse of untrusted input
  (restored grid state, user callbacks and row data, icon sources, MCP/WebMCP input, token JSON):
  this is plain JavaScript with no schema library, so `typeof` is the parser. `host.ts` keeps
  `unknown` row ids (public API types them so), and the skeleton keeps its public `shape` property.
  Generated files (React wrappers, icon paths, phone data) are ignored.
