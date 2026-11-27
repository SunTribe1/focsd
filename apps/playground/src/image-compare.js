import './base.js';
import '@focsd-dev/components';

await customElements.whenDefined('focsd-image-compare');

const output = /** @type {HTMLOutputElement} */ (document.querySelector('#committed'));

document.querySelector('#bridge')?.addEventListener('focsd-position-change', (event) => {
  output.value = `${/** @type {CustomEvent<{ position: number }>} */ (event).detail.position}%`;
});

window.__ready = true;
