// Empty-app block: the first-run screen. Wire the primary action to your own create flow.
import '@focsd/components/focsd-app-shell.js';
import '@focsd/components/focsd-header.js';
import '@focsd/components/focsd-theme-toggle.js';
import '@focsd/components/focsd-sidebar.js';
import '@focsd/components/focsd-sidebar-item.js';
import '@focsd/components/focsd-empty-state.js';
import '@focsd/components/focsd-button.js';
import '@focsd/components/focsd-link.js';

const status = document.getElementById('create-status');

document.getElementById('create').addEventListener('click', () => {
  // Replace this with your create flow, for example opening a dialog or navigating to /projects/new.
  status.textContent = '';
  requestAnimationFrame(() => {
    status.textContent = 'Sample page: connect this button to your own create flow.';
  });
});
