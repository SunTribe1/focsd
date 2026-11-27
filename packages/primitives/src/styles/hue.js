import { unsafeCSS } from 'lit';

/*
 * Category color hooks. A colorful preset (Prismatic) defines --focsd-hue-1 … --focsd-hue-8 and
 * their -tint; no other preset does. These rules point a component's private --_hue / --_hue-tint
 * at one of them, and the component reads var(--_hue, <its usual color>): with the hooks undefined
 * the fallback applies, so every other preset looks exactly as before.
 */

const N = [1, 2, 3, 4, 5, 6, 7, 8];

/** The two hue properties pointing at hue `n`. @param {number} n */
const slot = (n) => `--_hue: var(--focsd-hue-${n}); --_hue-tint: var(--focsd-hue-${n}-tint);`;

/** The hue named by the host's `data-hue` (1–8), set from a name (avatar) or a color (tag, badge). */
export const hueStyles = unsafeCSS(N.map((n) => `:host([data-hue='${n}']) { ${slot(n)} }`).join('\n'));

/** Hues cycling with the host's position among its siblings (navigation items, dock items). */
export const cycleHueStyles = unsafeCSS(N.map((n) => `:host(:nth-child(8n + ${n})) { ${slot(n)} }`).join('\n'));
