import './base.js';
import '@focsd/components';

const sheet = document.getElementById('s');

document.getElementById('open-sheet').addEventListener('click', (e) => sheet.show(e.currentTarget));

const terms = document.getElementById('nd');

document.getElementById('open-terms').addEventListener('click', (e) => terms.show(e.currentTarget));

window.__events = [];

for (const el of document.querySelectorAll('focsd-bottom-sheet')) {
  el.addEventListener('focsd-snap-change', (e) => window.__events.push({ type: 'focsd-snap-change', index: e.detail.index }));
  el.addEventListener('close', () => window.__events.push({ type: 'close', id: el.id }));
}
