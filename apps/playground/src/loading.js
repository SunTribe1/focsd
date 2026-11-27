import './base.js';
import '@focsd/components';

const overlay = /** @type {import('@focsd/components').FocsdLoadingOverlay | null} */ (document.getElementById('lo'));

document.getElementById('toggle')?.addEventListener('click', () => {
  if (overlay) overlay.active = !overlay.active;
});

// The demo form only shows the overlay; it never submits.
document.getElementById('f')?.addEventListener('submit', (event) => event.preventDefault());
