// The helpers live in @focsd-dev/primitives, which the playground does not depend on, so import their source.
import './base.js';
import '@focsd-dev/components';
import { setLinkHandler, setLocale } from '../../../packages/primitives/src/utils.js';

const routed = document.getElementById('routed');
const calls = document.getElementById('calls');
let count = 0;

// A stand-in for a client-side router: it records the route and updates the URL without a page load.
setLinkHandler((url) => {
  count += 1;
  calls.value = String(count);
  routed.value = `${url.pathname}${url.search}`;
  history.pushState(null, '', url);

  return true;
});

document.getElementById('locale-de').addEventListener('click', () => setLocale('de'));

document.getElementById('locale-reset').addEventListener('click', () => setLocale(null));
