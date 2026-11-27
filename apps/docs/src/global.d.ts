/**
 * Globals the docs' inline scripts share. Head.astro creates the promise before first paint,
 * Register.astro resolves it with the package exports once the component bundle has loaded, and
 * Example.astro awaits it in examples whose code imports from `@focsd/*` (an inline script cannot
 * import bare package names).
 */
export {};

/** What example scripts can import by name: the same exports their `import { … } from '@focsd/…'` shows. */
type DocsExports = typeof import('@focsd/components') & typeof import('@focsd/data-grid');

declare global {
  interface Window {
    /** Resolves with the exports of `@focsd/components` and `@focsd/data-grid`. */
    focsdDocsReady: Promise<DocsExports>;
    /** Resolves {@link Window.focsdDocsReady}; absent on pages that do not register components. */
    __focsdDocsResolve?: (exports: DocsExports) => void;
  }

  /** The WebMCP entry point a browser may provide (AgentTools.astro registers the docs tools on it). */
  interface Document {
    modelContext?: object;
  }

  interface Navigator {
    modelContext?: object;
  }
}
