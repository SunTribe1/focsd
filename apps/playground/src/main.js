import './base.js';
import '@focsd-dev/components';

const root = document.documentElement;

const bind = (id, attr) => {
  const select = document.getElementById(id);
  select.addEventListener('change', () => {
    if (select.value) root.setAttribute(attr, select.value);
    else root.removeAttribute(attr);
  });
};

bind('pg-theme', 'data-focsd-theme');

bind('pg-density', 'data-focsd-density');

// Button section
const buttonRow = document.getElementById('button-row');
const buttonCount = document.getElementById('btn-count');

buttonRow.addEventListener('click', (event) => {
  if (event.target.localName === 'focsd-button') buttonCount.value = String(Number(buttonCount.value) + 1);
});

document.getElementById('btn-form').addEventListener('submit', (event) => {
  event.preventDefault();
  document.getElementById('btn-form-result').value = 'submitted';
});

// Text field section
const tfForm = document.getElementById('tf-form');

tfForm.addEventListener('submit', (event) => {
  event.preventDefault();
  document.getElementById('tf-result').value = JSON.stringify(Object.fromEntries(new FormData(tfForm)));
});

// Dialog section
const dialog = document.getElementById('dlg');

document.getElementById('dlg-open').addEventListener('click', (event) => dialog.show(event.currentTarget));

dialog.addEventListener('close', () => {
  document.getElementById('dlg-result').value = `closed: ${dialog.returnValue || '(dismissed)'}`;
});

// Tabs section
const tabs = document.getElementById('tabs');

tabs.addEventListener('change', () => {
  document.getElementById('tabs-result').value = String(tabs.selected);
});

// Select section
const selForm = document.getElementById('sel-form');

selForm.addEventListener('submit', (event) => {
  event.preventDefault();
  document.getElementById('sel-result').value = JSON.stringify(Object.fromEntries(new FormData(selForm)));
});
