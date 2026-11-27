import './base.js';
import '@focsd/components';

const form = document.getElementById('f');

form.addEventListener('submit', (event) => {
  event.preventDefault();
  document.getElementById('out').value = JSON.stringify([...new FormData(form)]);
});

window.__events = [];

for (const el of document.querySelectorAll('focsd-phone-field'))
  for (const type of ['input', 'change']) el.addEventListener(type, () => window.__events.push({ id: el.id, type, value: el.value }));
