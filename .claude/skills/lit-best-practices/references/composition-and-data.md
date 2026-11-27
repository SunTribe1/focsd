# Lit composition and data: rules by page

Source pages: https://lit.dev/docs/composition/ (overview, component-composition, mixins, controllers),
https://lit.dev/docs/data/ (context, task, signals), https://lit.dev/docs/localization/. Paraphrased.

## Choosing a composition tool

- Prefer a **reactive controller** ("has-a") unless the feature must add public API to the component or needs very
  granular lifecycle access; then a **mixin** ("is-a").
- A piece of UI deserves its own component when it has its own state or template, is reused, does one thing well and
  has a clear API.

## Component composition

- Properties down, events up. Set properties on subcomponents rather than calling their methods.
- A component is the source of truth for the subcomponents in its shadow DOM; subcomponents never set properties on
  or call methods of their host.
- A component that changes its own public property fires an event; name it for its meaning in that component's API.
- Siblings share data through a mediator parent (or a store).
- Shadow DOM is private to the component. Light-DOM children can change at any time: render them with `<slot>` and
  react to `slotchange`.

## Reactive controllers

- Constructor stores the host and calls `host.addController(this)`.
- Hooks (all optional): `hostConnected` (renderRoot exists; add listeners/observers), `hostUpdate` (before
  `update`/`render`; read DOM), `hostUpdated` (after update, before the host's `updated`), `hostDisconnected`
  (clean up). Controller hooks run before the host's matching hook. Only the constructor runs under SSR.
- Host API: `addController`, `removeController`, `requestUpdate`, `updateComplete`.
- Controllers can compose child controllers and expose directives as methods. Focsd examples: `LocalizeController`,
  the sortable controller, roving focus.

## Mixins

- A mixin is a subclass factory `(superClass) => class extends superClass {}`.
- Always call `super` in standard custom element callbacks; call `super.updated?.(changed)` etc. for Lit callbacks.
- A mixin's styles and render helpers must be documented so users include them.

## Context (`@lit/context`)

- Protocol of `context-request` events (bubbling, composed). Keys compare with `===`; use a unique object or Symbol
  in its own module.
- `ContextProvider` (`setValue(v, force)`) and `ContextConsumer` (`subscribe` false by default). `ContextRoot` for
  late providers. Focsd does not use context today.

## Task (`@lit/task`)

- One Task per async operation, as a field: `new Task(this, { task, args })`, both arrow functions.
- `args` drives auto-runs (`autoRun` true; empty args runs once; no args = manual `run()`).
- Status `INITIAL/PENDING/COMPLETE/ERROR`; render with `task.render({ pending, complete, error })`.
- The `AbortSignal` cancels nothing by itself: check `signal.throwIfAborted()` after each await. Superseded results
  are ignored.

## Signals (`@lit-labs/signals`, labs)

- Experimental. One copy of `signal-polyfill` per page. `SignalWatcher` mixin, `watch()` directive. Not used by
  Focsd.

## Localization

- Lit's `@lit/localize` (`msg`, `str`, runtime vs transform mode) is not used; Focsd has its own term tables
  (`registerTranslation`, `this.localize.term`). The best practices still apply:
  - never freeze a translated string into a property default; fall back in `render()` (`this.label ||
    this.localize.term('x')`);
  - keep markup out of translated strings; one sentence per message;
  - use BCP 47 locale codes; validate a locale before building a URL from it.
