import { css } from 'lit';

/** Floating surface used by popovers, menus and tooltips. */
export const floatingSurface = css`
  box-sizing: border-box;
  margin: 0;
  border: var(--focsd-border-width) solid var(--focsd-edge);
  border-radius: var(--focsd-radius-surface);
  background: var(--focsd-surface-raised);
  color: var(--focsd-ink);
  box-shadow: var(--focsd-shadow-overlay);
  font-family: var(--focsd-font-sans);
`;

/**
 * Height cap for popup lists: never more than `cap`, half the layout viewport, or half the visual
 * viewport (which shrinks when a phone's on-screen keyboard opens; see trackVisualViewport).
 * Scrolling stops at the list's edges instead of carrying on into the page behind it.
 * @param {import('lit').CSSResult} cap
 */
export const popupBlockSize = (cap) => css`
  max-block-size: min(${cap}, 50vh, var(--_focsd-visual-viewport-height, 100vh) / 2);
  max-block-size: min(${cap}, 50dvh, var(--_focsd-visual-viewport-height, 100dvh) / 2);
  overflow: auto;
  overscroll-behavior: contain;
`;
