import './base.js';
import '@focsd/components';

window.__events = [];

for (const el of document.querySelectorAll('focsd-hover-card'))
  for (const type of ['focsd-open', 'close']) el.addEventListener(type, () => window.__events.push({ id: el.id, type }));

const dialog = document.getElementById('dlg');

document.getElementById('dlg-open').addEventListener('click', (e) => dialog.show(e.currentTarget));
