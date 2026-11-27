import './base.js';
import '@focsd-dev/components';

const count = document.getElementById('fp-count');

document.getElementById('fp-outside').addEventListener('click', () => (count.value = String(Number(count.value) + 1)));

window.__fpEvents = [];

for (const panel of document.querySelectorAll('focsd-floating-panel')) {
  for (const type of ['focsd-open', 'close', 'focsd-move'])
    panel.addEventListener(type, (e) => window.__fpEvents.push({ id: panel.id, type, detail: e.detail ?? null }));
}
