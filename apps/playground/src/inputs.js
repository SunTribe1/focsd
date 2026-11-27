import './base.js';
import '@focsd-dev/components';

const form = document.getElementById('inputs');

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const entries = {};

  for (const [key, value] of new FormData(form)) {
    const v = value instanceof File ? value.name : value;
    entries[key] = key in entries ? [entries[key], v].flat() : v;
  }

  document.getElementById('inputs-result').value = JSON.stringify(entries);
});

const cmd = document.getElementById('cmd');

document.getElementById('cmd-open').addEventListener('click', () => cmd.show());

cmd.addEventListener('focsd-select', (event) => {
  document.getElementById('cmd-result').value = event.detail.value;
});

document.getElementById('cal').addEventListener('change', (event) => {
  document.getElementById('cal-result').value = event.target.value;
});
