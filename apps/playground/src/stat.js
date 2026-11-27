import './base.js';
import '@focsd/components';

await Promise.all(['focsd-stat', 'focsd-animated-number', 'focsd-status-dot'].map((tag) => customElements.whenDefined(tag)));

const visitors = /** @type {HTMLElement & { value: number }} */ (document.querySelector('#visitors'));

document.querySelector('#bump')?.addEventListener('click', () => {
  visitors.value = Number(visitors.value) + 500;
});

window.__ready = true;
