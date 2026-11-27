// The helpers live in @focsd-dev/primitives, which the playground does not depend on, so import their source.
import './base.js';
import '@focsd-dev/components';
import { setLinkHandler } from '../../../packages/primitives/src/utils.js';

const routed = /** @type {HTMLOutputElement} */ (document.getElementById('routed'));
const calls = /** @type {HTMLOutputElement} */ (document.getElementById('calls'));
let count = 0;

// A stand-in for a client-side router: it records the route and moves the current item, without a page load.
setLinkHandler((url) => {
  count += 1;
  calls.value = String(count);
  routed.value = url.pathname;

  for (const item of document.querySelectorAll('focsd-bottom-nav-item'))
    /** @type {any} */ (item).current = new URL(/** @type {any} */ (item).href, location.href).pathname === url.pathname;

  return true;
});

await customElements.whenDefined('focsd-bottom-nav');

window.__ready = true;
