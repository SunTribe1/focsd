import './base.js';
import '@focsd/components';

const form = document.getElementById('pf');

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const entries = {};

  for (const [key, value] of new FormData(form)) entries[key] = key in entries ? [entries[key], String(value)].flat() : String(value);
  document.getElementById('pt-result').value = JSON.stringify(entries);
});

const form2 = document.getElementById('pf2');

form2.addEventListener('submit', (event) => {
  event.preventDefault();
  const { submitter } = event;
  document.getElementById('pt2-result').value = JSON.stringify({
    action: new URL(submitter.formAction).pathname,
    method: submitter.formMethod,
    noValidate: submitter.formNoValidate,
    target: submitter.formTarget,
    data: Object.fromEntries(new FormData(form2, submitter)),
  });
});
