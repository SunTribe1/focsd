---
name: focsd-component-authoring
description: Checklist for adding or changing a Focsd component - headless base in @focsd-dev/primitives, styled element, properties, events, styles and tokens, accessibility, localization, docs tags, manifests, wrappers, tests and changesets. Use before writing a new focsd-* element or changing a component's API.
---

# Authoring a Focsd component

Read first: `DESIGN.md` (tokens, type, focus ring), `docs/events.md`, the `lit-best-practices` skill. Open an issue
to agree the API and the ARIA pattern before a new component.

## 1. Where code goes

| Layer | Path | Contains |
| --- | --- | --- |
| Headless base | `packages/primitives/src/<area>/<name>-base.js` | `FocsdXBase extends FocsdElement`: properties, behaviour, ARIA, keyboard, template, events. No visual styles beyond the floor. |
| Styled class | `packages/components/src/classes/focsd-<name>.js` | `FocsdX extends FocsdXBase` with `static styles`. No side effects. |
| Registration | `packages/components/src/focsd-<name>.js` | Re-exports the class and calls `defineElement('focsd-<name>', FocsdX)`. |
| Entry | `packages/components/src/index.js` | `export { FocsdX } from './focsd-<name>.js';` |

Other packages (`ai`, `charts`, `data-grid`, `editor`) follow the same split.

## 2. Properties

- Declare in `static properties`; set every default in the constructor with a JSDoc type and one-line description
  (the manifest and docs read it). Never a class field.
- Booleans default to `false`; name them accordingly.
- Reflect only what styles or the owner need; new reflected properties set `useDefault: true` and style the unset
  state. Never reflect objects or arrays.
- Internal state: `state: true`, `_` prefix, never documented.
- Derived values in `willUpdate()`. Never set a reactive property in `updated()`/`firstUpdated()`; the e2e fixture
  fails on Lit's `change-in-update` warning.

## 3. Events

- Follow `docs/events.md`: native names only with native meaning (plain `Event`, no `detail`); everything else
  `focsd-<name>` as `CustomEvent` with a typed `detail`; `{ bubbles: true }`, **never** `composed`.
- Fire for user actions and async changes, not when the owner sets a property.
- Document with `@fires`.

## 4. Styles

- `static styles = [Base.styles, hostStyles, ..., css`...`]`. Tokens only (`--focsd-*`); private custom properties
  are `--_name`. Logical properties only (`inline`/`block`), checked by `pnpm check`.
- Public knobs: `@cssprop --focsd-<name>-*` documented on the element they are named after; `@csspart` for every
  part. The focus ring comes from the floor and shared styles; don't restyle it.
- Respect `prefers-reduced-motion` and forced colours (test both).

## 5. Accessibility

- Follow the WAI-ARIA APG pattern; full keyboard support; visible focus; targets ≥ 24 px, controls follow
  `--focsd-control-height`.
- Focusable hosts set `delegatesFocus` so `host.focus()` works.
- Status changes are announced with the shared `announce()` helper, never with a live region per element.
- Every visible string goes through `this.localize.term()`; add terms to the term tables (English source) and keep
  translations in sync. The `visible-strings` check fails on literal strings.

## 6. Docs and metadata

- JSDoc on the class: summary, `@slot`, `@csspart`, `@cssprop`, `@fires`; JSDoc on every public property and
  method. `pnpm --filter <pkg> analyze` regenerates `custom-elements.json`; types, React/Vue/Svelte/JSX wrappers,
  agent contracts (`node scripts/agent/build.mjs`) and `@focsd-dev/react` (`pnpm --filter @focsd-dev/react generate`)
  follow from it.
- A playground page in `apps/playground/` and a docs page in `apps/docs/src/content/docs/components/`.
- Add the component to `docs/components-catalogue.md` and run `node scripts/check-counts.mjs`.

## 7. Tests and release

- Tests first (see `focsd-testing`): e2e spec per component with keyboard, axe (3 themes), forced colours,
  reduced motion, RTL, form behaviour where relevant; unit tests for pure logic.
- Size budget row in the package's budget test.
- `pnpm changeset` describing the change for users; conventional commit; `pnpm check` and the suites green.
