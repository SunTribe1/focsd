# Lit components: rules by page

Source pages: https://lit.dev/docs/components/ (overview, defining, rendering, properties, styles, lifecycle,
shadow-dom, events, decorators). Paraphrased; short quotes are marked.

## Defining

- Extend `LitElement` and register with `customElements.define()` (JS) or `@customElement` (TS). Focsd: extend
  `FocsdElement`, register with `defineElement(tag, Class)`.
- Publish typings with an `HTMLElementTagNameMap` entry per element. Focsd generates
  `packages/*/types/elements.d.ts`.

## Rendering

- `render()` may return primitives, `TemplateResult`, nodes, `nothing`, `noChange`, arrays or iterables. An `svg`
  result is only valid inside an `<svg>` element; never return one from `render()`.
- `render()`: no state changes, no side effects, only properties as input, same output for the same properties.
- Avoid DOM updates outside `render()`. For an event-driven change, set a reactive property and render from it.
- Several property changes in one task produce one update at microtask timing.
- Template parts can be instance methods so a subclass can override them.

## Reactive properties

- Public properties are input. A component should not change its own public properties except in response to
  user input, and then it dispatches an event.
- Internal state: `state: true` (only `hasChanged` applies). Never referenced from outside; prefix with `_` in JS.
- **JavaScript must not use class fields for reactive properties**: they shadow the accessor. Initialize in the
  constructor.
- Options and defaults: `attribute` (true; a string names it; false drops converter, reflect and type), `converter`,
  `hasChanged` (default `notEqual`, strict inequality), `noAccessor` (rarely needed), `reflect` (false), `state`
  (false), `type` (hint for the default converter; String if unset), `useDefault` (keep the default in memory, don't
  reflect it initially, restore it when the attribute is removed; avoid for objects and arrays).
- Mutating an object or array does not trigger an update. Prefer immutable replacement; mutate + `requestUpdate()`
  is the advanced case. `requestUpdate()` only updates the current component, not children that share the object.
- Default converter: String, Number, Boolean, Array and Object (JSON). Null or undefined removes a reflected
  attribute.
- Boolean properties must default to false to be settable from markup.
- Reflection best practice: treat attributes as owner input, reflect sparingly (consider custom states `:state()`),
  reflecting properties typically also set `useDefault: true`, never reflect objects or arrays.
- Custom accessors are rarely needed. If you write one, keep a getter and a setter and call
  `this.requestUpdate(name, oldValue)` in the setter. Prefer `willUpdate` for derived values, a setter only for
  synchronous validation.

## Styles

- `static styles` with `css` is almost always best; evaluated once per class.
- `css` only accepts nested `css` results or numbers. `unsafeCSS` only for trusted input: untrusted CSS can
  exfiltrate data.
- Inherit with `[Super.styles, css`...`]`. Share styles by exporting them from a module.
- Unicode escapes in `css` need a double backslash.
- Styles match only the shadow tree; `:host` rules are defaults the outside can override; `::slotted()` matches
  direct slotted children only.
- `<style>` in a template is per instance; expressions inside it are very inefficient. External stylesheets are not
  recommended for reusable elements (FOUC, relative URLs).
- Dynamic classes and inline styles: `classMap`, `styleMap`.
- Theming: CSS custom properties (inherit through shadow roots) and `::part`. Focsd: `--focsd-*` tokens and
  documented `@csspart`s.

## Lifecycle

- Always call `super` in standard callbacks.
- `constructor`: one-time setup and defaults. No DOM, no side effects (an element may never be connected).
- `connectedCallback`: Lit creates `renderRoot` and starts the first update; add document/window listeners here.
  Anything done here should be undone in `disconnectedCallback`. Internal listeners need no removal.
- `attributeChangedCallback`, `adoptedCallback`: rarely needed.
- Update order: `shouldUpdate` → `willUpdate` → `update` (reflect, then `render`) → `firstUpdated` (once) →
  `updated`. Property changes during `willUpdate`/`update`/`render` don't schedule another update; changes in
  `firstUpdated`/`updated` do (and warn `change-in-update` in dev).
- `updateComplete` resolves after the update (not after children's), to `false` if a property was set in
  `updated()`, and rejects if the update threw. Dispatch events after rendering by awaiting it. For measuring
  layout, prefer `ResizeObserver`.
- Override `getUpdateComplete()` (await `super.getUpdateComplete()` first), never the `updateComplete` getter.
- `scheduleUpdate()` overrides must call `super.scheduleUpdate()`. Don't override `performUpdate()` for timing.
- `hasUpdated` is true after the first update; `renderRoot` is not guaranteed before it.

## Shadow DOM

- Query `renderRoot` after the first render (`firstUpdated`) or with a getter.
- Children render only through a `<slot>`. Named slots accept only matching `slot` children. Fallback content
  renders only when nothing (not even whitespace) is assigned; render `nothing` rather than whitespace.
- Slotted elements exist only after the slot renders: read them in `firstUpdated`/`updated` or on `slotchange`.
- `static shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true }` so `host.focus()` reaches
  the inner control. Focsd sets this on focusable elements.
- Rendering into light DOM (`createRenderRoot() { return this; }`) loses scoping; generally not recommended.

## Events

- Template `@event` listeners are bound to the component and removed automatically.
- Listeners on the host itself: add in the constructor (event delegation; works only for bubbling events).
  Listeners on window, document or other outside nodes: add in `connectedCallback`, remove in
  `disconnectedCallback` with the same function reference.
- `bubbles` lets an event take part in delegation. `composed` lets it leave the shadow root; most native UI events
  are both. A composed event from inside a component is retargeted to look as if it came from the host;
  `composedPath()` breaks encapsulation.
- Dispatch in response to user interaction or async state changes, **not** in response to the owner setting
  state. Dispatch after rendering (`await this.updateComplete`) when listeners may read the DOM.
- Data: `CustomEvent` with `detail`, or a subclass of `Event`. Communicate back with `preventDefault()`.

## Decorators (for TypeScript consumers)

- Focsd uses none. If a contributor writes TypeScript: experimental decorators, `useDefineForClassFields: false`,
  no `emitDecoratorMetadata`. Standard decorators need `accessor` and TypeScript 5.2+.
