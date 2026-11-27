/**
 * Defines a custom element unless its tag is taken: a second copy of an element module on the
 * page (two bundles, or a module loaded twice) skips the define instead of throwing. The manifest
 * analyzer reads `defineElement('focsd-x', FocsdX)` calls as definitions (see
 * custom-elements-manifest.config.mjs).
 * @param {string} tag
 * @param {CustomElementConstructor} element
 */
export function defineElement(tag, element) {
  // Through a local name, so the analyzer does not read this generic call as a definition.
  const registry = customElements;

  /* v8 ignore next -- define guard: only a second copy of a module finds its tag defined */
  if (!registry.get(tag)) registry.define(tag, element);
}
