// Empty-app block: the first-run screen. Wire the primary action to your own create flow.
import '@focsd-dev/components/focsd-app-shell.js';
import '@focsd-dev/components/focsd-header.js';
import '@focsd-dev/components/focsd-theme-toggle.js';
import '@focsd-dev/components/focsd-sidebar.js';
import '@focsd-dev/components/focsd-sidebar-item.js';
import '@focsd-dev/components/focsd-empty-state.js';
import '@focsd-dev/components/focsd-button.js';
import '@focsd-dev/components/focsd-link.js';

const status = document.getElementById('create-status');

document.getElementById('create').addEventListener('click', () => {
  // Replace this with your create flow, for example opening a dialog or navigating to /projects/new.
  status.textContent = '';
  requestAnimationFrame(() => {
    status.textContent = 'Sample page: connect this button to your own create flow.';
  });
});
