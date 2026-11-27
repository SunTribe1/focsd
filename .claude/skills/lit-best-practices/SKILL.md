---
name: lit-best-practices
description: Lit 3 rules for writing, reviewing or debugging any Focsd element - reactive properties, lifecycle (willUpdate vs updated), templates and directives, styles, shadow DOM, events, controllers, SSR, publishing. Use whenever you touch a LitElement class, a `html`/`css` template, a directive or a reactive controller.
---

# Lit 3 best practices (Focsd edition)

Distilled from every page of the Lit 3 docs at lit.dev (guides, API reference, upgrade guide), checked against
Focsd's code on 2026-11-25. Focsd writes **plain ESM JavaScript with JSDoc, no decorators**, so the rules below are
stated for that style. Each rule links the page it comes from; the reference files hold the detail.

## The twelve rules that matter most

1. **Never declare a reactive property as a class field.** In JavaScript a class field shadows the accessor Lit
   generates, and the property stops being reactive. Declare it in `static properties` and give it its default in
   the constructor after `super()`. ([properties](https://lit.dev/docs/components/properties/))
2. **Compute derived state in `willUpdate()`, never by setting properties in `updated()` or `firstUpdated()`.**
   A write after render schedules a second update and the dev build warns `change-in-update`. Focsd's e2e fixture
   fails any test that triggers that warning. ([lifecycle](https://lit.dev/docs/components/lifecycle/))
3. **`render()` is pure.** Use only properties as input, no side effects, no state changes (event handlers declared
   inside the template are fine). ([rendering](https://lit.dev/docs/components/rendering/))
4. **Boolean properties default to `false`.** An attribute can only turn a boolean on; name it so off is the
   default (`disabled`, not `enabled`; `plain`, not `markdown`). ([properties](https://lit.dev/docs/components/properties/))
5. **Reflect sparingly, and new reflected properties set `useDefault: true`** (Lit 3.3+), so a default does not
   sprout an attribute and removing the attribute restores the default. Style the unset state, not
   `[attr=default]`. Never reflect objects or arrays. ([properties](https://lit.dev/docs/components/properties/))
6. **Replace objects and arrays, don't mutate them.** Mutation does not trigger an update; `requestUpdate()` after
   mutation is the advanced case. ([properties](https://lit.dev/docs/components/properties/))
7. **Events: `focsd-*` events bubble and are not composed.** Dispatch them for user actions or async changes, not
   when the owner sets a property (native-parity `toggle` is the documented exception). See `docs/events.md`.
   ([events](https://lit.dev/docs/components/events/))
8. **Anything added in `connectedCallback()` is removed in `disconnectedCallback()`**, and both call `super`. An
   element can be connected, disconnected and reconnected. ([lifecycle](https://lit.dev/docs/components/lifecycle/))
9. **Styles go in `static styles` with the `css` tag.** No `<style>` with expressions in templates, no external
   stylesheets. `unsafeCSS` and `unsafeStatic` take developer-controlled strings only. ([styles](https://lit.dev/docs/components/styles/))
10. **No expressions in invalid places:** tag or attribute names (use `literal`/`unsafeStatic` for constant tags),
    `<textarea>` content (bind `.value`), `contenteditable` content, comments, `<template>` content.
    ([expressions](https://lit.dev/docs/templates/expressions/))
11. **Form inputs bind `.value=${live(x)}`** when the user can change the value Lit last wrote; keyed lists whose
    items hold DOM state use `repeat()` with a stable key. ([directives](https://lit.dev/docs/templates/directives/),
    [lists](https://lit.dev/docs/templates/lists/))
12. **Code that runs on the server stays DOM-free.** `constructor`, `willUpdate` and `render` run under SSR; touch
    the DOM in `firstUpdated`, `updated` or `connectedCallback`, and guard with `isServer` where needed.
    ([SSR authoring](https://lit.dev/docs/ssr/authoring/))

## Reference files

Read the one that matches the task:

| File | Covers |
| --- | --- |
| [references/components.md](references/components.md) | Defining, rendering, properties, styles, lifecycle, shadow DOM, events. |
| [references/templates.md](references/templates.md) | Expressions, conditionals, lists, built-in and custom directives, static HTML. |
| [references/composition-and-data.md](references/composition-and-data.md) | Component composition, controllers, mixins, context, Task, signals, localization. |
| [references/tooling-publishing-ssr.md](references/tooling-publishing-ssr.md) | Requirements, dev vs prod builds, testing, publishing, production, React, SSR. |
| [references/api-contracts.md](references/api-contracts.md) | LitElement/ReactiveElement contracts, PropertyDeclaration options, directive classes, upgrade notes, doc errata. |

## How Focsd applies Lit

- Every element extends `FocsdElement` (`packages/primitives/src/internal/focsd-element.js`), which adds the
  accessibility floor styles and `this.localize`.
- Behaviour lives in a headless base class in `@focsd/primitives`; the styled element in `@focsd/components` (or
  `ai`, `charts`, `data-grid`, `editor`) adds `static styles` and registers with `defineElement()`, which guards
  against a second `customElements.define`.
- Focsd does not use `@lit/localize`; strings go through `this.localize.term(key, ...)` and `registerTranslation()`.
  Never freeze a translated string into a property default (Lit's localization best-practice applies equally).

Related skills: `focsd-component-authoring` (the full checklist for a new component), `focsd-testing`,
`open-wc-standards`.
