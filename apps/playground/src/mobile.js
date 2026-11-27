import './base.js';
import '@focsd-dev/components';

/** Long lists, so every popup has to scroll inside the space it is given. */
const fill = (id, tag, count, label) => {
  const host = document.getElementById(id);

  for (let i = 1; i <= count; i += 1) {
    const el = document.createElement(tag);
    el.setAttribute('value', `v${i}`);
    el.textContent = `${label} ${i}`;
    host.append(el);
  }
};

fill('m-select', 'focsd-option', 40, 'Country');

fill('m-combo', 'focsd-option', 40, 'City');

fill('m-menu', 'focsd-menu-item', 30, 'Action');

fill('m-nested', 'focsd-option', 20, 'Item');
