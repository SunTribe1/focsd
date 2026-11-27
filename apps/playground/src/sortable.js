import './base.js';
import '@focsd/components';

const long = document.getElementById('long');

for (let i = 1; i <= 20; i++) {
  const item = document.createElement('focsd-list-item');
  item.textContent = `Ticket ${i}`;
  long.append(item);
}

// The locked list refuses every move.
document.getElementById('lc').addEventListener('focsd-reorder', (event) => event.preventDefault());

window.__ev = [];

for (const list of document.querySelectorAll('focsd-list'))
  list.addEventListener('focsd-reorder', (event) => window.__ev.push({ list: list.id, from: event.detail.from, to: event.detail.to }));

window.__tagEvents = [];

const tags = document.getElementById('t');

for (const type of ['input', 'change', 'focsd-reorder'])
  tags.addEventListener(type, (event) =>
    window.__tagEvents.push(type === 'focsd-reorder' ? { type, ...event.detail } : { type, value: tags.value }),
  );

const form = document.getElementById('f');

form.addEventListener('submit', (event) => {
  event.preventDefault();
  document.getElementById('out').value = JSON.stringify([...new FormData(form)]);
});
