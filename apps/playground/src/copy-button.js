import './base.js';
import '@focsd-dev/components';

window.__ev = [];

for (const id of ['c1', 'c2', 'c3']) {
  const el = document.getElementById(id);

  for (const type of ['focsd-copy', 'focsd-error']) el.addEventListener(type, () => window.__ev.push({ type, id }));
}

await customElements.whenDefined('focsd-copy-button');

window.__ready = true;
