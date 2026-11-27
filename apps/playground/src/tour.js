import './base.js';
import '@focsd-dev/components';

window.__ev = [];

const tour = document.getElementById('tour');

tour.steps = [
  { target: '#search', title: 'Search', body: 'Find any project by name or owner.', placement: 'bottom' },
  { target: '#missing', title: 'Filters', body: 'Not on this page.' },
  { target: '#export', title: 'Export', body: 'Download the table as CSV.', placement: 'top' },
];

document.getElementById('start').addEventListener('click', () => tour.start());

tour.addEventListener('focsd-step-change', (event) => window.__ev.push({ type: event.type, step: event.detail.step }));

tour.addEventListener('close', (event) => window.__ev.push({ type: event.type, completed: event.target.completed }));

document.getElementById('page-action').addEventListener('click', () => {
  document.getElementById('page-out').textContent = 'clicked';
});

const tags = new Set([...document.querySelectorAll('*')].flatMap((e) => (e.localName.startsWith('focsd-') ? [e.localName] : [])));

await Promise.all([...tags].map((t) => customElements.whenDefined(t)));

window.__ready = true;
