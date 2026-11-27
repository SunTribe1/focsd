import './base.js';
import '@focsd-dev/components';

const byId = (/** @type {string} */ id) => /** @type {any} */ (document.getElementById(id));

for (const [button, dialog] of [
  ['open-dialog', 'dialog'],
  ['open-drawer', 'drawer'],
  ['open-alert-dialog', 'alert-dialog'],
  ['open-no-close', 'no-close'],
])
  byId(button).addEventListener('click', (/** @type {Event} */ event) => byId(dialog).showModal(event.currentTarget));

byId('kept').addEventListener('close', (/** @type {Event} */ event) => event.preventDefault());

await customElements.whenDefined('focsd-dialog');

window.__ready = true;
