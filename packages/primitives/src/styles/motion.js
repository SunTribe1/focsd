import { css, unsafeCSS } from 'lit';

/**
 * Motion helpers (DESIGN.md: minimal and functional). Durations and easing come from tokens, which
 * are 0ms under prefers-reduced-motion, so no component needs its own reduced-motion rule.
 * Only opacity and transform animate. Popovers also fade out: their closed state is the "from" state,
 * and `display`/`overlay` transition with allow-discrete so they stay rendered while fading. While
 * fading they never take pointer events, and are inert where `interactivity` is supported. Modal dialogs close instantly: a closing modal must leave the
 * accessibility tree at once. Engines without allow-discrete close popovers instantly too.
 */

/**
 * Fade and move in when `selector` starts rendering (display none -> shown, popover/dialog open).
 * @param {string} selector
 * @param {{ from?: string, duration?: string }} [options]
 */
export function enterMotion(selector, { from = 'translateY(-4px)', duration = 'base' } = {}) {
  const time = `var(--focsd-duration-${duration})`;
  const state = /:popover-open/.exec(selector)?.[0];
  /** @param {string} ease */
  const moves = (ease) => [`opacity ${time} ${ease}`, `transform ${time} ${ease}`];
  const discrete = state ? [`display ${time} allow-discrete`, `overlay ${time} allow-discrete`] : [];

  const enter = unsafeCSS(`
${selector} {
  transition: ${[...moves('var(--focsd-ease-enter)'), ...discrete].join(', ')};
}
@starting-style {
  ${selector} {
    opacity: 0;
    transform: ${from};
  }
}`);

  if (!state) return enter;

  const exit = exitMotion(selector.replace(state, ''), selector.replace(state, `[popover]:not(${state})`), {
    from,
    transition: [...moves('var(--focsd-ease-exit)'), ...discrete].join(', '),
  });

  return css`${exit}${enter}`;
}

/**
 * A popover's closed state, the "from" state it fades out to. `pointer-events: none` keeps a
 * fading popover from catching clicks in engines without `interactivity`.
 * @param {string} element the popover, open or closed
 * @param {string} closed the popover while closed
 * @param {{ from: string, transition: string }} options
 */
function exitMotion(element, closed, { from, transition }) {
  return unsafeCSS(`
${element} {
  transition: ${transition};
}
${closed} {
  opacity: 0;
  transform: ${from};
  pointer-events: none;
  interactivity: inert;
}`);
}

/**
 * Color feedback on hover and selection. Never box-shadow or outline: the focus ring must appear instantly.
 * This animates paint (background, border and text color), the one approved exception to "only
 * opacity and transform" (DESIGN.md, Motion). `press` adds the transform a pressed button scales with.
 * @param {string} selector
 * @param {{ press?: boolean }} [options]
 */
export function hoverMotion(selector, { press = false } = {}) {
  return unsafeCSS(`
${selector} {
  ${hoverTransition({ press }).cssText}
}`);
}

/**
 * The `hoverMotion` transition as one declaration, for a rule that is already written.
 * @param {{ press?: boolean }} [options]
 */
export function hoverTransition({ press = false } = {}) {
  const properties = ['background-color', 'border-color', 'color', ...(press ? ['transform'] : [])];

  return unsafeCSS(`transition: ${properties.map((p) => `${p} var(--focsd-duration-quick) var(--focsd-ease-move)`).join(', ')};`);
}
