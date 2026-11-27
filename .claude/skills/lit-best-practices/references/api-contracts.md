# Lit API contracts

Source pages: https://lit.dev/docs/api/ (LitElement, ReactiveElement, templates, styles, decorators, directives,
custom-directives, static-html, controllers, misc), https://lit.dev/docs/releases/upgrade/,
https://lit.dev/docs/libraries/. Paraphrased. Checked against Focsd on 2026-11-25: no overrides of
`performUpdate`, `scheduleUpdate`, `attributeChangedCallback`, `createProperty` or the `updateComplete` getter; no
`PropertyValueMap`; no imports from `lit-element`; custom setters call `requestUpdate(name, old)`.

## LitElement / ReactiveElement

| Member | Contract |
| --- | --- |
| `static properties` | Map of PropertyDeclarations; `state` properties have no attribute. Don't mutate object/array public properties. |
| `static styles` | `CSSResultGroup`; duplicates are removed, the last one wins. |
| `static shadowRootOptions` | Passed to `attachShadow`; respect it if you override `createRenderRoot`. |
| `static createProperty` | If overridden, call `super.createProperty`. Don't override `getPropertyOptions`. |
| `static addInitializer` | Per constructor; runs superclass first; not inherited upward. |
| `static enableWarning/disableWarning/enabledWarnings` | Dev builds only; access with `?.`. Kinds: `change-in-update`, `migration`. |
| `attributeChangedCallback` | If overridden, call `super.attributeChangedCallback(name, old, value)`. |
| `connectedCallback` / `disconnectedCallback` | Set up and tear down external work; may reconnect. |
| `addController` / `removeController` | If already connected, `hostConnected()` runs at once. |
| `createRenderRoot` | Default: open shadow root with styles adopted. Return the shadow root if you override it (event retargeting). |
| `renderRoot` | Not guaranteed before `hasUpdated`. |
| `render` / `update` / `willUpdate` | Setting properties here does not trigger another update. |
| `firstUpdated` / `updated` | Setting properties here triggers another update (and the dev warning). |
| `scheduleUpdate` | Override to change timing; must call `super.scheduleUpdate()`. |
| `performUpdate` | Don't override for scheduling; if the update throws, `firstUpdated`/`updated` don't run. |
| `requestUpdate(name?, old?, options?)` | No args for non-reactive changes; name + old value from custom setters. |
| `updateComplete` | Resolves `false` if a property was set in `updated()`; rejects if the update threw. Override `getUpdateComplete()`, never the getter. |
| `hasUpdated`, `isUpdatePending` | Read-only flags. |

## PropertyDeclaration

`attribute` (true / name / false), `converter` (function or `{ fromAttribute, toAttribute }`), `hasChanged`
(default `notEqual`), `noAccessor` (you then call `requestUpdate` yourself), `reflect` (false), `state` (false),
`type` (converter hint), `useDefault` (Lit 3.3+, documented on the properties guide). Use `PropertyValues<this>`
for lifecycle parameters; `PropertyValueMap` is deprecated in favour of `PropertyValues`.

## Templates and styles

- `html` describes DOM lazily; `svg` only for fragments inside `<svg>`; prefer `nothing` over other falsy values.
- `render(value, container, options)`: options (`host`, `renderBefore`, `creationScope`, `isConnected`) must stay
  constant for a container.
- `css` takes literal strings and numbers only; `unsafeCSS` is the escape hatch for trusted text. `CSSResult`
  can't be constructed directly.

## Directives

- `Directive`/`AsyncDirective`, `directive()`, `PartType` (ATTRIBUTE 1, CHILD 2, PROPERTY 3, BOOLEAN_ATTRIBUTE 4,
  EVENT 5, ELEMENT 6), `PartInfo`.
- `noChange` keeps the previous value. `setValue()` never synchronously from `render`/`update`.
- Directive helpers (`lit/directive-helpers.js`) are for advanced directives; `setChildPartValue` is not for the
  directive's own container part.

## Controllers

- `ReactiveController` hooks: `hostConnected`, `hostDisconnected`, `hostUpdate`, `hostUpdated` (the last two never
  run under SSR). Any object implementing `ReactiveControllerHost` can host controllers.

## Misc

- `isServer` is true only where the toolchain honours the `node` export condition.
- `LitUnstable`, `ReactiveUnstable`, `Unstable` namespaces can change in a patch release; don't depend on them.
- `window.emitLitDebugLogEvents` (dev only) emits `lit-debug` events; costs performance.

## Lit 2 → 3 (upgrade guide)

- IE11 dropped; packages are ES2021; deprecated Lit 2 APIs removed (`UpdatingElement`, decorators re-exported from
  `lit-element`, positional `queryAssignedNodes`, `lit/experimental-hydrate*.js`).
- Decorated accessors now call `requestUpdate` automatically; define both getter and setter.
- Libraries may depend on `"^2.7.0 || ^3.0.0"`; Lit 2 and 3 interoperate. Focsd depends on `^3.3.3` (it needs
  Lit 3.3 features).

## Labs status (Nov 2026)

- Near graduation: `scoped-registry-mixin`. Under development: `ssr`, `ssr-client`, `signals`, `virtualizer`,
  `observers`, `motion`, `testing`, `eleventy-plugin-lit`. Prototyping: `analyzer`, `cli`, `compiler`,
  `preact-signals`, `router`. Labs packages break more often; graduated ones move to `@lit/*`.

## Doc errata (don't copy these samples)

- `@customElement('x');` with a trailing semicolon (localization pages).
- The Task chaining example is missing `async`.
- Localization config names its mode as `mode`, `output.mode` and `interchange.format` on different pages; the
  config schema uses `output.mode` and `interchange.format`.
- `range(end)` signature vs prose that mentions `start` and `step`.
- The `connectedCallback` sample adds an unbound method as a listener.
