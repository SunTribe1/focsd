import './base.js';
import '@focsd-dev/tokens/presets.css';
import '@focsd-dev/components';

await Promise.all(['focsd-theme-toggle', 'focsd-theme-picker'].map((tag) => customElements.whenDefined(tag)));

window.__ready = true;
