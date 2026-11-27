import './base.js';
import '@focsd/components';
import { setLocale } from '../../../packages/primitives/src/utils.js';

// The playground app owns the data (owner ruling 75): it answers focsd-read and focsd-dismiss itself.
const minutesAgo = (/** @type {number} */ m) => new Date(Date.now() - m * 60_000).toISOString();

/** @type {import('@focsd/primitives').NotificationData[]} */
const START = [
  { id: 'n1', title: 'Build #482 passed', body: 'main is green again.', time: minutesAgo(2), href: '#builds', tone: 'positive' },
  { id: 'n2', title: 'Ana commented on Pricing', body: '“Can we ship the annual plan first?”', time: minutesAgo(45), href: '#comments' },
  { id: 'n3', title: 'Payment failed', body: 'Card ending 4242 was declined.', time: minutesAgo(180), tone: 'critical' },
  { id: 'n4', title: 'Weekly report ready', time: minutesAgo(60 * 26), read: true },
];

const center = /** @type {any} */ (document.querySelector('#center'));

const log = /** @type {HTMLElement} */ (document.querySelector('#log'));

center.notifications = START;

/** @param {string} line */
const note = (line) => {
  log.textContent = line;
};

center.addEventListener('focsd-read', (/** @type {CustomEvent} */ event) => {
  const ids = new Set(event.detail.ids);
  center.notifications = center.notifications.map((n) => (ids.has(n.id) ? { ...n, read: true } : n));
  note(`focsd-read: ${[...ids].join(', ')}`);
});

center.addEventListener('focsd-dismiss', (/** @type {CustomEvent} */ event) => {
  center.notifications = center.notifications.filter((n) => n.id !== event.detail.id);
  note(`focsd-dismiss: ${event.detail.id}`);
});

let added = 0;

document.querySelector('#arrive')?.addEventListener('click', () => {
  for (let i = 0; i < 3; i += 1) {
    added += 1;
    const id = `new-${added}`;
    setTimeout(() => {
      center.notifications = [{ id, title: `New sign-up ${id.slice(4)}`, time: new Date().toISOString() }, ...center.notifications];
    }, i * 150);
  }
});

const markup = /** @type {HTMLElement} */ (document.querySelector('#markup'));

markup.addEventListener('focsd-read', (/** @type {CustomEvent} */ event) => {
  for (const id of event.detail.ids) document.getElementById(id)?.setAttribute('read', '');
});

markup.addEventListener('focsd-dismiss', (/** @type {CustomEvent} */ event) => {
  document.getElementById(event.detail.id)?.remove();
});

/** @type {any} */ (document.querySelector('#rtl')).notifications = START.slice(0, 2);

// The e2e spec switches the language of every relative time on the page.
window.__setLocale = setLocale;

window.__ready = true;
