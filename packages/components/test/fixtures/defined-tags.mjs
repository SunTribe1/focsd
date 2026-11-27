// Prints, as JSON, the custom element names defined while importing one module (argv[2]) in a
// fresh Node process under Lit's DOM shim. Used by per-element.test.mjs (quality B11, Q33).
import '@lit-labs/ssr/lib/install-global-dom-shim.js';
import process from 'node:process';

/** @type {string[]} */
const defined = [];
const registry = globalThis.customElements;
const define = registry.define.bind(registry);

registry.define = (name, ...rest) => {
  defined.push(name);

  return define(name, ...rest);
};

await import(process.argv[2]);

process.stdout.write(JSON.stringify(defined.toSorted()));
