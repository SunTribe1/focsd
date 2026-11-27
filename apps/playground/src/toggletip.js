import './base.js';
import '@focsd-dev/components';

window.__ev = [];

for (const id of ['tt', 'tt2']) {
  const el = document.getElementById(id);

  el.addEventListener('focsd-open', () => window.__ev.push({ id, type: 'focsd-open' }));
  el.addEventListener('close', () => window.__ev.push({ id, type: 'close' }));
}

await customElements.whenDefined('focsd-toggletip');

window.__ready = true;
