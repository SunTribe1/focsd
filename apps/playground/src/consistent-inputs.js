import '@focsd/tokens/fonts.css';
import '@focsd/tokens/tokens.css';
import './playground.css';
import '@focsd/components';

const form = document.getElementById('f');

form.addEventListener('submit', (event) => {
  event.preventDefault();
  document.getElementById('out').value = JSON.stringify([...new FormData(form)]);
});

const tags = new Set([...document.querySelectorAll('*')].flatMap((e) => (e.localName.startsWith('focsd-') ? [e.localName] : [])));

await Promise.all([...tags].map((t) => customElements.whenDefined(t)));

window.__ready = true;
