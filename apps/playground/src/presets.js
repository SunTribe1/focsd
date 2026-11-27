import './base.js';
import '@focsd/tokens/presets.css';
import '@focsd/components';

await Promise.all(['focsd-theme-toggle', 'focsd-theme-picker'].map((tag) => customElements.whenDefined(tag)));

window.__ready = true;
