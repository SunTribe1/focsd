# Versioning and deprecation policy

Focsd follows [Semantic Versioning](https://semver.org). `@focsd-dev/tokens`, `@focsd-dev/primitives`, `@focsd-dev/components`, `@focsd-dev/data-grid`, `@focsd-dev/editor`, `@focsd-dev/charts`, `@focsd-dev/ai`, `@focsd-dev/mcp`, `@focsd-dev/webmcp`, `@focsd-dev/react` and the `focsd` CLI always share one version number.

## What counts as what

| Change | Bump |
|---|---|
| Removing or renaming a tag, attribute, property, method, event, slot, CSS part, CSS custom property or token | **major** |
| Changing a default that changes how existing markup looks or behaves (for example the default density) | **major** |
| Changing a role, accessible name or keyboard interaction that assistive-technology users rely on (except to fix a WCAG failure) | **major** |
| A new component, attribute, property, event, slot, part or token; a new option with today's behavior as the default | minor |
| Bug fixes, accessibility fixes, performance, docs, visual polish within the design language | patch |

Every breaking change is listed under **Major changes** in the changelog with a migration note. The [changelog page](https://focsd.dev/changelog/) collects every release.

## Deprecation

1. Mark the old API `@deprecated` in JSDoc, keep it working, and call `deprecated(id, what, instead)` from `@focsd-dev/primitives/internal`. It warns once per page in the console.
2. Ship the replacement in the same release.
3. Keep the deprecated API for at least one minor release.
4. Remove it in the next major, and list it under **Major changes** with the replacement.

## Changelog

Every user-visible change gets a changeset (`pnpm changeset`) written for users: what changed, why, and what to do. `pnpm changeset version` writes the CHANGELOG.md files and bumps the versions.

When an upgrade needs mechanical edits (renamed attributes, for example), the release ships a codemod and the changelog shows how to run it.
