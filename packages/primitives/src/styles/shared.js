import { css } from 'lit';

/** Host defaults shared by every styled Focsd element. */
export const hostStyles = css`
  :host {
    font-family: var(--focsd-font-sans);
    color: var(--focsd-ink);
    /* Selection bars (box-shadow inset) sit on the inline-start side. */
    --_inline-bar: var(--focsd-selection-bar-width);
  }
  :host(:dir(rtl)) {
    --_inline-bar: calc(-1 * var(--focsd-selection-bar-width));
  }
  :host([hidden]) {
    display: none !important;
  }
  /* Titles balance their lines; body text avoids a lone word on its last line (where supported). */
  [part~='headline'],
  [part~='heading'],
  [part~='title'] {
    text-wrap: balance;
  }
  [part~='body'],
  [part~='description'],
  [part~='message'] {
    text-wrap: pretty;
  }
`;

/** Declarations: hidden on screen, still read by assistive technology (the floor's .focsd-visually-hidden). */
export const visuallyHidden = css`
  position: absolute !important;
  inline-size: 1px;
  block-size: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
`;

/** The hatched "disabled" surface from DESIGN.md. */
export const hatch = css`repeating-linear-gradient(-45deg, var(--focsd-surface) 0 6px, var(--focsd-hatch) 6px 8px)`;
