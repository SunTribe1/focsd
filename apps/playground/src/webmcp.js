import './base.js';
import '@focsd-dev/components';
import { enableWebMCP } from '@focsd-dev/webmcp';

// The booking form answers agents with a confirmation; humans see it on the page too.
document.getElementById('book').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target));
  const message = `Booked a table for ${data.guests} under ${data.name}.`;
  document.getElementById('booked').value = message;

  if (event.agentInvoked) event.respondWith(Promise.resolve({ ok: true, message }));
});

document.getElementById('contact').addEventListener('submit', (event) => {
  event.preventDefault();

  if (event.agentInvoked) event.respondWith(Promise.resolve({ sent: true }));
});

window.__webmcp = enableWebMCP();
