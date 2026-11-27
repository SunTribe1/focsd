# Lit templates: rules by page

Source pages: https://lit.dev/docs/templates/ (overview, expressions, conditionals, lists, directives,
custom-directives) and https://lit.dev/docs/api/static-html/. Paraphrased.

## Expressions

- Expressions go only where attribute values and child content can go.
- Child values: primitives (booleans render "true"/"false"), `TemplateResult`, nodes, `nothing`, `noChange`,
  arrays/iterables. `''`, `null`, `undefined`, `nothing` render nothing; Symbols throw.
- Attribute values are strings; quote the whole value when an expression is only part of it. `undefined`/`null`
  render an empty attribute, `nothing` removes it. Pattern: `aria-label=${this.label || nothing}`.
- `?attr` for boolean attributes, `.prop` for properties (case preserved), `@event` for listeners (function or
  `handleEvent` object, bound to the component).
- Element expressions accept only directives (for example `ref`).
- Templates must be well-formed with every expression replaced by an empty value; no unclosed elements.
- **Invalid locations:** tag and attribute names; `<template>` content; `<textarea>` content (bind `.value`);
  `contenteditable` content (bind `.innerText`); comments; `<style>` under ShadyCSS.
- `lit/static-html.js`: `literal` and `unsafeStatic` allow static tag/attribute names. Every new value re-parses a
  template and is cached forever, so values must rarely change and never come from reactive properties.
  `unsafeStatic` takes developer-controlled strings only (no sanitization). Focsd uses it for constant tag names
  read from class statics.

## Conditionals and lists

- Plain JS (ternary, `if`, `switch`, helper methods) is usually enough. `cache()` keeps DOM for large templates you
  switch between.
- `map`/loops reuse nodes and reassign values. Use `repeat(items, key, template)` when moving nodes is cheaper than
  updating them or when nodes hold state not driven by the template (focus, checked, scroll). Keys must be unique.
  Without a key, use `map`.

## Built-in directives

- One module per directive; import only what you use (`lit/directives/<name>.js`).
- `classMap`: the only expression in `class` (static classes allowed). `styleMap`: the only expression in `style`;
  custom properties quoted; `null`/`undefined` removes a property.
- `when`, `choose` (strict equality, first match), `map`, `join`, `range` (end exclusive).
- `ifDefined(v)` = `v ?? nothing` for attributes; no-op elsewhere.
- `cache`, `keyed` (new key disposes DOM; use for stateful elements and enter/exit), `guard` (identity check on
  dependencies; for immutable data).
- `live(v)`: compares with the live DOM value; strict equality, so don't use where the binding converts types; pass
  strings to attributes. Use for inputs the user can edit.
- `templateContent`, `unsafeHTML`, `unsafeSVG`: developer-controlled content only (XSS). Focsd's markdown
  renderer builds DOM nodes and uses none of these.
- `ref`/`createRef`: the callback gets `undefined` first when the element changes or goes away.
- `until`, `asyncAppend` (child only), `asyncReplace`. Under SSR, `until` renders its first non-promise value and
  the async directives render nothing.

## Custom directives

- Simple functions, or classes extending `Directive` passed to `directive()`; `AsyncDirective` for async values.
- `render()` is required; `update(part, args)` is optional and must call `render()` itself if it needs it. Only
  `render()` runs under SSR, so keep DOM access in `update()`.
- Return `noChange` to keep the previous value; returning `undefined` clears the part.
- Restrict usage by checking `PartInfo.type` in the constructor and throwing.
- `AsyncDirective`: clean up in `disconnected()`, always implement `reconnected()` with it, check `isConnected`
  before subscribing, never call `setValue()` synchronously from `render`/`update`.
