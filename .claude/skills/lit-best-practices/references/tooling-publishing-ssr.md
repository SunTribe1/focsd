# Lit tooling, publishing and SSR: rules by page

Source pages: https://lit.dev/docs/tools/ (overview, requirements, development, testing, publishing, production,
starter-kits, adding-lit), https://lit.dev/docs/frameworks/react/, https://lit.dev/docs/ssr/. Paraphrased.

## Requirements

- Lit 3 ships ES2021 with bare module specifiers. Supported: current Chromium, Safari, Firefox, the two prior
  Chromium and Safari majors, Firefox ESR. No IE11.

## Development

- Every Lit package has a dev build (warnings) and a prod build, picked by the `development` export condition;
  production is the default. Focsd's playground and tests run the dev build; Focsd packages mirror the pattern
  (`development` → `src/`).
- Dev warnings: `change-in-update` (on) and `migration` (off). `enableWarning`/`disableWarning` exist only in dev
  builds; guard with `?.`.
- "Multiple versions of Lit loaded" warning: check `window.litElementVersions` etc., `npm ls`, dedupe. Focsd keeps
  one copy (lit 3.3.x).
- Lint with ESLint + `eslint-plugin-lit`; IDE `lit-plugin`, CLI `lit-analyzer`.

## Testing

- Test in real browsers; don't shim the DOM for component tests. Focsd: Playwright in Chromium, Firefox and WebKit
  for components; Vitest in Node only for pure logic.

## Publishing (component packages)

- `package.json`: `type: module`, `main` and `module` (Focsd also: `types`, `exports` with `types`/`development`/
  `default`, `sideEffects`, `customElements`, `files`).
- Publish standard ES2021 JavaScript plus `.d.ts` (and maps) and an `HTMLElementTagNameMap` per element.
- **Don't bundle, minify or optimize**; don't import polyfills (document which APIs might need one); a CDN bundle,
  if any, lives apart from the npm modules.
- File extensions on every non-entry import (`lit/directives/live.js`).
- Self-define in the declaring module ("exporting a class and expecting the user to call define() is brittle") and
  export the class so it can be extended.
- Don't bundle Lit into a published package; keep `lit` an external dependency.

## Production (applications, not packages)

- Bundle, minify (Terser; minify template literals with a plugin), serve modern code, hash, compress. This is the
  application's job, which is why packages ship without minification.

## React (`@lit/react`)

- `createComponent({ tagName, elementClass, react, events })`. Props that are element properties are set as
  properties, event props attach listeners, everything else is an attribute. Name event props `on` + event name and
  avoid clashes with element properties. Named slots need a wrapper element (`display: contents`).
- `useController` turns a reactive controller into a hook. Focsd generates `@focsd-dev/react` with `createComponent`.

## SSR (`@lit-labs/ssr`, labs)

- Only shadow-DOM components are supported; async work in components is not.
- On the server: `constructor`, `hasChanged`, `willUpdate`, `render` run; `connectedCallback`, `update`,
  `firstUpdated`, `updated` don't. Controllers: only the constructor. Directives: constructor and `render`.
- No DOM access in code that runs on the server; module-level browser side effects move into client callbacks or
  are guarded (`isServer` from `lit`, or feature checks such as `globalThis.CSSStyleSheet?.prototype.replaceSync`).
- The DOM shim offers only attributes, `attachShadow` (stub), `customElements.define/get`.
- Client: load `@lit-labs/ssr-client/lit-element-hydrate-support.js` before any component and before `lit`.
  `defer-hydration` delays hydration of top-level elements.
- Conditional `exports` (`node` / `default`) when a package needs different server code.
- Focsd's smoke test (`pnpm test:smoke`) renders and hydrates components with `@lit-labs/ssr-client`.

## CSP

- Under a strict CSP that blocks inline styles, Lit's `<style>` fallback needs `window.litNonce`. Focsd uses
  adopted stylesheets only, and `apps/playground/e2e/strict-csp.spec.js` checks every page under a strict policy.
