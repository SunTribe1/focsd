import './base.js';
import '@focsd/components';

const form = /** @type {HTMLFormElement} */ (document.getElementById('form'));
const out = /** @type {HTMLOutputElement} */ (document.getElementById('out'));

form.addEventListener('submit', (event) => {
  event.preventDefault();
  out.value = JSON.stringify([...new FormData(form)]);
});

await customElements.whenDefined('focsd-segmented-control');

window.__ready = true;
