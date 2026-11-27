import './base.js';
import '@focsd/components';

window.__ev = [];

const sb = document.getElementById('sb');

sb.addEventListener('click', () => window.__ev.push({ type: 'click' }));

sb.addEventListener('focsd-select', (event) => window.__ev.push({ type: 'focsd-select', value: event.detail.value }));

const tags = new Set([...document.querySelectorAll('*')].flatMap((e) => (e.localName.startsWith('focsd-') ? [e.localName] : [])));

await Promise.all([...tags].map((t) => customElements.whenDefined(t)));

window.__ready = true;
