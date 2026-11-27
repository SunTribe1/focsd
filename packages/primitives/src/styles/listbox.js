import { css, unsafeCSS } from 'lit';
import { floatingSurface, popupBlockSize } from './surface.js';

/**
 * Listbox styles shared by select, the combobox family, tag input, phone field, command and virtual
 * list (quality Q15): one popup, one group separator and label, one option, one clear button and one
 * active-option cue, so every list looks and answers the keyboard the same way.
 */

/**
 * The active option (aria-activedescendant, or the focused option element): the two-tone focus
 * ring drawn inside the option, so a scrolling list never clips it. The ring sits the same distance
 * from every edge (the selection bar is a shadow inside the box, not a border), and a selected
 * option keeps its bar on top of the ring. Forced colors keep a Highlight outline because
 * box-shadow is dropped there.
 * @param {string} selector
 */
export function activeOption(selector) {
  return unsafeCSS(`
${selector} {
  outline: 2px solid transparent;
  outline-offset: -2px;
  background: var(--focsd-surface-sunk);
  box-shadow: var(--_selection-bar, 0 0 transparent), var(--focsd-focus-ring-inset);
}
@media (forced-colors: active) {
  ${selector} {
    outline-color: Highlight;
  }
}`);
}

/**
 * The floating popup that holds a listbox, placed under `anchor` (a CSS anchor name) and flipped
 * above it when there is no room below.
 * @param {string} anchor
 */
export const listboxPopup = (anchor) => css`
  ${floatingSurface}
  position-anchor: ${unsafeCSS(anchor)};
  position-area: block-end span-inline-end;
  position-try-fallbacks: flip-block;
  inset: auto;
  margin-block: var(--focsd-space-1);
  min-inline-size: anchor-size(inline);
  ${popupBlockSize(css`18rem`)}
  padding: var(--focsd-space-1);
`;

/** Declarations: the quiet rule above a group that follows other options. */
export const groupRule = css`
  margin-block-start: var(--focsd-space-1);
  padding-block-start: var(--focsd-space-1);
  border-block-start: var(--focsd-border-width) solid var(--focsd-edge-quiet);
`;

/** Declarations: a group's label. */
export const groupLabel = css`
  padding: var(--focsd-space-2) var(--focsd-space-3) var(--focsd-space-1);
  color: var(--focsd-ink-muted);
  font-size: var(--focsd-text-label-size);
  font-weight: var(--focsd-text-label-weight);
`;

/**
 * Declarations: one option row. The selection bar is an inset shadow on the inline-start side
 * (`--_selection-bar`, set by `selectedOption`), with its width kept in the padding so the text
 * does not move when it appears.
 */
export const optionBox = css`
  --_selection-bar: 0 0 transparent;
  display: flex;
  align-items: center;
  gap: var(--focsd-space-2);
  min-block-size: var(--focsd-control-height);
  padding-inline: calc(var(--focsd-space-3) + var(--focsd-selection-bar-width)) var(--focsd-space-3);
  border-radius: var(--focsd-radius-control);
  box-shadow: var(--_selection-bar);
  cursor: pointer;
`;

/** Declarations: a selected option shows the selection bar and a heavier label. */
export const selectedOption = css`
  --_selection-bar: inset var(--_inline-bar) 0 0 var(--focsd-action);
  font-weight: var(--focsd-text-label-weight);
`;

/** Declarations: in forced colors (no box-shadow) the selection bar is a Highlight border instead. */
export const selectedOptionForced = css`
  border-inline-start: var(--focsd-selection-bar-width) solid Highlight;
  padding-inline-start: var(--focsd-space-3);
`;

/** The quiet rule between groups, and a group's label. */
export const listboxGroupStyles = css`
  [part~='group'] + [part~='group'],
  [part~='option'] + [part~='group'],
  [part~='group'] + [part~='option'] {
    ${groupRule}
  }
  [part~='group-label'] {
    ${groupLabel}
  }
`;

/** One option: a control-height row with the selection bar on its inline-start side. */
export const listboxOptionStyles = css`
  [part~='option'] {
    ${optionBox}
  }
  [part~='option']:hover {
    background: var(--focsd-surface-sunk);
  }
  [part~='option'][aria-selected='true'] {
    ${selectedOption}
  }
  [part~='option'][aria-disabled='true'] {
    color: var(--focsd-ink-muted);
    cursor: not-allowed;
  }
  @media (forced-colors: active) {
    [part~='option'][aria-selected='true'] {
      ${selectedOptionForced}
    }
  }
`;

/** The clear button inside a field: an inner control, square, quiet until hovered. */
export const listboxClearStyles = css`
  [part~='clear'] {
    display: inline-grid;
    place-items: center;
    flex: none;
    inline-size: var(--focsd-control-height-inner);
    block-size: var(--focsd-control-height-inner);
    padding: 0;
    border: 0;
    border-radius: var(--focsd-radius-control);
    background: transparent;
    color: var(--focsd-ink-muted);
    font: inherit;
    cursor: pointer;
  }
  [part~='clear']:hover {
    background: var(--focsd-surface-sunk);
    color: var(--focsd-ink);
  }
  [part~='clear'][hidden] {
    display: none;
  }
`;
