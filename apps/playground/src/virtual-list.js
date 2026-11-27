import './base.js';
import '@focsd/components';

const text = (s) => document.createTextNode(s);

const fixed = document.getElementById('fixed');

fixed.items = Array.from({ length: 100_000 }, (_, i) => ({ id: i, name: `Item ${i + 1}` }));

fixed.renderItem = (item) => text(item.name);

// Variable heights: every seventh row has a picture that "loads" later and grows by 80px.
let loaded = false;
const variable = document.getElementById('var');

variable.items = Array.from({ length: 2_000 }, (_, i) => ({
  id: i,
  text: `Row ${i + 1}${i % 3 ? '' : ' with a longer message that wraps onto a second line in a narrow list'}`,
}));

variable.renderItem = (item) => {
  const el = document.createElement('div');
  el.textContent = item.text;

  if (item.id % 7 === 0) {
    const pic = document.createElement('div');
    pic.className = 'pic';
    pic.style.blockSize = loaded ? '80px' : '0px';
    el.append(pic);
  }

  return el;
};

window.__loadImages = () => {
  loaded = true;

  for (const pic of variable.shadowRoot.querySelectorAll('.pic, [part~="row"] .pic')) pic.style.blockSize = '80px';

  for (const pic of variable.querySelectorAll('.pic')) pic.style.blockSize = '80px';
};

const pick = document.getElementById('pick');

pick.items = Array.from({ length: 500 }, (_, i) => ({ id: `u${i}`, name: `Person ${i + 1}` }));

pick.keyOf = (item) => item.id;

pick.renderItem = (item) => text(item.name);

window.__ranges = [];

fixed.addEventListener('focsd-range-change', (e) => window.__ranges.push(e.detail));

window.__changes = 0;

pick.addEventListener('change', () => (window.__changes += 1));
