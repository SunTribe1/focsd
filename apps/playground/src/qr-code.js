import './base.js';
import '@focsd/components';

for (const id of ['q', 'qh', 'qn', 'ql']) {
  document.getElementById(id)?.addEventListener('focsd-error', (event) => {
    window.__log.push({ type: 'focsd-error', id, reason: /** @type {CustomEvent} */ (event).detail.reason });
  });
}

// Set after the listeners, so the error this value causes is recorded.
const tooLong = document.getElementById('ql');

if (tooLong) tooLong.value = 'A'.repeat(3000);

await customElements.whenDefined('focsd-qr-code');

window.__ready = true;
