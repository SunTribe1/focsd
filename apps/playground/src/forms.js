import './base.js';
import '@focsd-dev/components';

const prefs = document.getElementById('prefs');

prefs.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(prefs);
  const entries = {};

  for (const [key, value] of data) entries[key] = key in entries ? [entries[key], value].flat() : value;
  document.getElementById('prefs-result').value = JSON.stringify(entries);
});

const account = document.getElementById('account');

account.addEventListener('submit', (event) => {
  event.preventDefault();
  document.getElementById('account-result').value = JSON.stringify(Object.fromEntries(new FormData(account)));
});

const tools = document.getElementById('tools');
const summary = document.getElementById('es');

tools.addEventListener('submit', (event) => {
  event.preventDefault();
  const missing = [...tools.querySelectorAll('[required]')].filter((el) => !el.checkValidity());
  summary.errors = missing.map((el) => ({ field: el.id, message: `Enter a ${el.label.toLowerCase()}` }));

  if (missing.length) return;
  const entries = {};

  for (const [key, value] of new FormData(tools)) entries[key] = key in entries ? [entries[key], value].flat() : value;
  document.getElementById('tools-result').value = JSON.stringify(entries);
});
