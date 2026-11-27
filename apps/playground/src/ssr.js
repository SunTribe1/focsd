import './base.js';
// Hydration support must load before any Lit element is defined.
import '@lit-labs/ssr-client/lit-element-hydrate-support.js';

/**
 * Server-rendered markup arrives in window.__ssr (the e2e test renders it with @lit-labs/ssr).
 * setHTMLUnsafe parses its declarative shadow roots, then the components load and hydrate.
 */
const root = document.getElementById('ssr-root');

if (window.__ssr) root.setHTMLUnsafe(window.__ssr);

window.__ssrShadowBeforeUpgrade = Boolean(root.querySelector('focsd-button')?.shadowRoot);

// The first server-made node in each shadow root: hydration must keep these very nodes, not re-render them.
window.__ssrNodes = [...root.children].map(
  (el) => el.shadowRoot?.querySelector('button, input, textarea, [part]') ?? el.shadowRoot?.querySelector(':not(style)') ?? null,
);

await import('@focsd-dev/components');

window.__ssrReady = true;
