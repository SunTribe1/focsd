import { css, html } from 'lit';
import { cssomStyle } from '../internal/style.js';

/**
 * The indicator part with its fill as `--_progress` (0–1), set through the CSSOM so a strict
 * `style-src` policy does not block it. Styles scale the indicator by it.
 * @param {number} fraction
 */
export const indicator = (fraction) => html`<span part="indicator" style=${cssomStyle({ '--_progress': String(fraction) })}></span>`;

/** The indicator fills from the inline start: a transform, so changes can animate without layout. */
export const indicatorStyles = css`
  [part~='indicator'] {
    transform: scaleX(var(--_progress));
    /* physical: there is no logical transform-origin; the :dir(rtl) rule below flips it */
    transform-origin: left;
  }
  :host(:dir(rtl)) [part~='indicator'] {
    /* physical: the right-to-left side of the pair above */
    transform-origin: right;
  }
`;
