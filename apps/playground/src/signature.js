import './base.js';
import '@focsd-dev/components';

const form = /** @type {HTMLFormElement} */ (document.getElementById('sign-form'));
const out = /** @type {HTMLOutputElement} */ (document.getElementById('out'));

/** One form entry as text: a file shows its name, type and size. */
const entry = ([key, value]) => (value instanceof File ? `${key}: ${value.name} (${value.type}, ${value.size} B)` : `${key}: ${value}`);

form.addEventListener('submit', (event) => {
  event.preventDefault();
  out.value = [...new FormData(form)].map(entry).join('; ') || 'Nothing submitted';
});

form.addEventListener('reset', () => {
  out.value = '';
});

await customElements.whenDefined('focsd-signature-pad');

window.__ready = true;
