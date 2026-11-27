import { css, html, nothing } from 'lit';
import { icon } from './icons.js';

/**
 * One icon API for every component that shows an icon next to its label:
 *
 * - `icon="name"`: an icon from the default library (built-in Lucide, or the one set with
 *   `setDefaultIconLibrary`), or from `icon-library="…"`, any library registered with
 *   `registerIconLibrary`.
 * - `slot="icon"`: any markup, so any icon kit works without registering it: an inline SVG, a React,
 *   Vue or Svelte icon component (react-icons, lucide-react, Heroicons, Phosphor…), an icon-font
 *   element such as Font Awesome's `<i class="fa-solid fa-truck">`, or an `<img>`.
 *
 * Each class declares the two properties itself (`icon: {}, iconLibrary: { attribute: 'icon-library' }`):
 * the custom elements manifest analyzer does not follow a spread, so a shared object would leave them
 * out of the manifest, the React wrappers and the MCP data.
 *
 * Both are decorative (hidden from assistive technology): the component's label names it. The
 * wrapper is hidden when there is neither, so it leaves no gap.
 */

/**
 * Whether the host has an element in its `icon` slot.
 * @param {HTMLElement} host
 */
export const hasSlottedIcon = (host) =>
  // Server rendering (Lit SSR) has no DOM to query: no slotted icon there; the client corrects it on hydration.
  (host.querySelector?.(':scope > [slot="icon"]') ?? null) !== null;

/**
 * The icon wrapper: the named icon, then the `icon` slot. Re-renders when the slot changes, so the
 * wrapper shows or hides with its content.
 * @param {HTMLElement & { icon?: string, iconLibrary?: string, requestUpdate: () => void }} host
 * @param {string} [part] the wrapper's part name
 */
export function leadingIcon(host, part = 'icon') {
  const named = host.icon ? icon({ name: host.icon, library: host.iconLibrary || undefined }, 'svg') : nothing;

  return html`<span part=${part} aria-hidden="true" ?hidden=${!host.icon && !hasSlottedIcon(host)}
    >${named}<slot name="icon" @slotchange=${() => host.requestUpdate()}></slot
  ></span>`;
}

/** Slotted SVGs and images in the icon slot are forced to the 1em icon box, whatever size they set. */
export const slottedIconBox = css`
  ::slotted(svg[slot='icon']),
  ::slotted(img[slot='icon']) {
    inline-size: 1em;
    block-size: 1em;
  }
`;

/**
 * Sizing for the icon wrapper. Icons are 1em of the wrapper's font size (`--focsd-icon-size`), and
 * slotted SVGs are forced to that box: icon components often set their own width and height
 * (lucide-react draws 24 × 24), which would otherwise break the row. Icon fonts follow the font size.
 */
export const iconSlotStyles = css`
  ${slottedIconBox}
  span[part~='icon'] {
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    font-size: var(--focsd-icon-size, 1.15em);
    line-height: 1;
    /* A colorful preset (Prismatic) gives icons a hue where the component cycles them (cycleHueStyles). */
    color: var(--_hue, inherit);
  }
  span[part~='icon'][hidden] {
    display: none;
  }
`;
