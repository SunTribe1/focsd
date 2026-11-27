import './base.js';
import '@focsd-dev/components';

const masonry = document.getElementById('m');

document.getElementById('force-fallback').addEventListener('click', () => (masonry.nativeMasonry = false));
