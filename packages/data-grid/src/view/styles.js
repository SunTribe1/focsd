import { css } from 'lit';
import { enterMotion, hoverMotion } from '@focsd-dev/primitives/styles/motion.js';
import { floatingSurface } from '@focsd-dev/primitives/styles/surface.js';

/** Visual layer for focsd-data-grid. Colors, spacing and durations come from tokens only. */
const gridRules = css`
  :host {
    --_row-height: 2.75rem;
    /* 1 in LTR, -1 in RTL: flips the physical x of inset edge shadows to the inline end. */
    --_inline-sign: 1;
    /* Stacking inside the grid, lowest first. */
    --_z-pinned: 1;
    --_z-header: 3;
    --_z-header-pinned: 4;
    --_z-drop: 5;
    --_z-edit-error: 6;
    display: grid;
    gap: var(--focsd-space-3);
    min-inline-size: 0;
    font-family: var(--focsd-font-sans);
    font-size: var(--focsd-text-small-size);
    color: var(--focsd-ink);
  }
  :host(:dir(rtl)) {
    --_inline-sign: -1;
  }
  :host([density='compact']) {
    --_row-height: 2.25rem;
  }
  [part~='grid'] {
    position: relative;
    overflow: auto;
    max-block-size: var(--focsd-data-grid-max-block-size, none);
    border: var(--focsd-border-width) solid var(--focsd-edge-quiet);
    border-radius: var(--focsd-radius-surface);
    background: var(--focsd-surface);
  }
  [part~='grid'] {
    /* The sticky header row: focus scrolling keeps cells below it (WCAG 2.4.11). */
    scroll-padding-block-start: var(--_row-height);
  }
  [part~='windowed'] {
    max-block-size: var(--focsd-data-grid-max-block-size, 32rem);
  }
  [role='rowgroup'] {
    display: block;
    inline-size: max-content;
    min-inline-size: 100%;
  }
  [part~='header-group'] {
    position: sticky;
    inset-block-start: 0;
    z-index: var(--_z-header);
  }
  [role='row'] {
    display: grid;
    grid-template-columns: var(--_template);
    block-size: var(--_row-height);
  }
  [part~='row'] {
    border-block-end: var(--focsd-border-width) solid var(--focsd-edge-quiet);
    background: var(--focsd-surface);
  }
  [part~='row']:hover > [part~='cell'] {
    background: var(--focsd-surface-sunk);
  }
  [part~='row'][aria-selected='true'] > [part~='cell'] {
    background: var(--focsd-surface-sunk);
    box-shadow: inset 0 -2px 0 var(--focsd-action);
  }
  [part~='header-row'] {
    border-block-end: var(--focsd-border-width) solid var(--focsd-edge);
    background: var(--focsd-ground);
  }
  [part~='cell'],
  [part~='header-cell'] {
    display: flex;
    align-items: center;
    gap: var(--focsd-space-2);
    min-inline-size: 0;
    padding-inline: var(--focsd-space-3);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    background: var(--focsd-surface);
  }
  [part~='header-cell'] {
    background: var(--focsd-ground);
    font-weight: var(--focsd-text-label-weight);
  }
  [part~='header-cell'] {
    position: relative;
    user-select: none;
  }
  [part~='sortable'] {
    cursor: pointer;
  }
  [part~='header-label'] {
    flex: 1 1 auto;
    min-inline-size: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  [part~='numeric'] [part~='header-label'] {
    text-align: end;
  }
  [part~='sort-indicator'] {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    color: var(--focsd-ink);
  }
  [part~='sort-priority'] {
    font-size: var(--focsd-text-label-size);
    font-variant-numeric: tabular-nums;
  }
  [part~='menu-button'] {
    display: inline-grid;
    place-items: center;
    flex: none;
    inline-size: 1.75rem;
    block-size: 1.75rem;
    padding: 0;
    border: 0;
    border-radius: var(--focsd-radius-control);
    background: transparent;
    color: var(--focsd-ink-muted);
    cursor: pointer;
    opacity: 0;
    transition: opacity var(--focsd-duration-quick) var(--focsd-ease-move);
  }
  [part~='header-cell']:hover [part~='menu-button'],
  [part~='header-cell']:focus-within [part~='menu-button'],
  [part~='menu-button'][aria-expanded='true'] {
    opacity: 1;
  }
  /* Touch screens have no hover to reveal the menu button. */
  @media (hover: none) {
    [part~='menu-button'] {
      opacity: 1;
    }
  }
  [part~='menu-button']:hover {
    background: var(--focsd-surface-sunk);
    color: var(--focsd-ink);
  }
  [part~='resize-handle'] {
    position: absolute;
    inset-block: 0;
    inset-inline-end: 0;
    inline-size: 8px;
    cursor: col-resize;
    touch-action: none;
  }
  [part~='resize-handle']:hover {
    box-shadow: inset calc(-2px * var(--_inline-sign)) 0 0 var(--focsd-action);
  }
  [part~='drop-indicator'] {
    position: absolute;
    inset-block: 0;
    z-index: var(--_z-drop);
    inline-size: 2px;
    background: var(--focsd-action);
    pointer-events: none;
  }
  [part~='column-menu'] {
    ${floatingSurface}
    position: fixed;
    /* The popover UA styles center it; the grid places it (popupAt) at its trigger. */
    inset: auto;
    min-inline-size: 13rem;
    padding: var(--focsd-space-1);
    font: inherit;
  }
  [part~='menu-item'] {
    display: flex;
    align-items: center;
    inline-size: 100%;
    min-block-size: 2.25rem;
    padding-inline: var(--focsd-space-3);
    border: 0;
    border-radius: var(--focsd-radius-control);
    background: transparent;
    color: var(--focsd-ink);
    font: inherit;
    text-align: start;
    cursor: pointer;
  }
  [part~='menu-item']:hover,
  [part~='menu-item']:focus-visible {
    background: var(--focsd-surface-sunk);
  }
  [part~='menu-item'][aria-disabled='true'] {
    color: var(--focsd-ink-muted);
    cursor: not-allowed;
  }
  [part~='menu-separator'] {
    block-size: 1px;
    margin-block: var(--focsd-space-1);
    background: var(--focsd-edge-quiet);
  }
  [part~='cell-text'] {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  /* Built-in cell displays (view/cells.js): a name with an avatar, and status chips. */
  [part~='person'] {
    display: inline-flex;
    align-items: center;
    gap: var(--focsd-space-2);
    max-inline-size: 100%;
    vertical-align: middle;
  }
  [part~='person'] focsd-avatar {
    --focsd-avatar-size: 1.5rem;
    flex: none;
  }
  [part~='chip'] {
    vertical-align: middle;
  }
  [part~='group-label'] {
    /* One indent step per nesting level below the first (--_group-level is set per row). */
    padding-inline-start: calc(var(--_group-level, 0) * var(--focsd-data-grid-indent, var(--focsd-space-4)));
  }
  [part~='numeric'] {
    justify-content: flex-end;
    font-variant-numeric: tabular-nums;
  }
  [part~='select'] {
    justify-content: center;
    padding-inline: 0;
  }
  [part~='pinned'] {
    position: sticky;
    z-index: var(--_z-pinned);
  }
  [part~='pinned-start-edge'] {
    box-shadow: inset calc(-1px * var(--_inline-sign)) 0 0 var(--focsd-edge);
  }
  [part~='pinned-end-edge'] {
    box-shadow: inset calc(1px * var(--_inline-sign)) 0 0 var(--focsd-edge);
  }
  [part~='header-cell'][part~='pinned'] {
    z-index: var(--_z-header-pinned);
  }
  [part~='cell']:focus-visible,
  [part~='header-cell']:focus-visible {
    outline: 2px solid transparent;
    box-shadow: var(--focsd-focus-ring-inset);
  }
  input[type='checkbox'] {
    inline-size: 1.125rem;
    block-size: 1.125rem;
    margin: 0;
    accent-color: var(--focsd-action);
  }
  input[type='checkbox']:focus-visible {
    outline: 2px solid transparent;
    box-shadow: var(--focsd-focus-ring);
  }
  [part~='footer'] {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--focsd-space-3);
    color: var(--focsd-ink-muted);
  }
  [part~='empty'] {
    margin: 0;
    padding: var(--focsd-space-5);
    color: var(--focsd-ink-muted);
    text-align: center;
  }
  [part~='empty']:empty {
    display: none;
  }

  [part~='toolbar'] {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--focsd-space-2);
  }
  [part~='search'] {
    position: relative;
    display: flex;
    align-items: center;
    flex: 1 1 16rem;
    max-inline-size: 22rem;
  }
  [part~='search-icon'] {
    position: absolute;
    inset-inline-start: var(--focsd-space-3);
    display: inline-grid;
    color: var(--focsd-ink-muted);
    pointer-events: none;
  }
  [part~='search-input'],
  [part~='filter-input'] {
    box-sizing: border-box;
    inline-size: 100%;
    min-block-size: 2.25rem;
    padding-inline: var(--focsd-space-3);
    border: var(--focsd-border-width) solid var(--focsd-edge);
    border-radius: var(--focsd-radius-control);
    background: var(--focsd-surface);
    color: var(--focsd-ink);
    font: inherit;
  }
  [part~='search-input'] {
    padding-inline-start: calc(var(--focsd-space-3) + 1.5em);
  }
  [part~='filter-input'][aria-invalid='true'] {
    border-color: var(--focsd-critical);
  }
  [part~='toolbar-actions'],
  [part~='panel-actions'],
  [part~='filter-actions'] {
    display: flex;
    flex-wrap: wrap;
    gap: var(--focsd-space-2);
  }
  [part~='toolbar-button'],
  [part~='filter-button'],
  [part~='chip-button'] {
    display: inline-flex;
    align-items: center;
    gap: var(--focsd-space-1);
    min-block-size: 2.25rem;
    padding-inline: var(--focsd-space-3);
    border: var(--focsd-border-width) solid var(--focsd-edge);
    border-radius: var(--focsd-radius-control);
    background: var(--focsd-surface);
    color: var(--focsd-ink);
    font: inherit;
    font-weight: var(--focsd-text-label-weight);
    cursor: pointer;
  }
  [part~='toolbar-button']:hover,
  [part~='filter-button']:hover,
  [part~='chip-button']:hover {
    background: var(--focsd-surface-sunk);
  }
  [part~='primary'] {
    border-color: var(--focsd-action);
    background: var(--focsd-action);
    color: var(--focsd-on-action);
  }
  [part~='primary']:hover {
    background: var(--focsd-action-hover);
  }
  [part~='quiet'] {
    border-color: transparent;
    background: transparent;
    text-decoration: underline;
  }
  [part~='chips'] {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--focsd-space-2);
  }
  [part~='chip-list'] {
    display: flex;
    flex-wrap: wrap;
    gap: var(--focsd-space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  [part~='chip-button'] {
    min-block-size: 2rem;
    border-radius: var(--focsd-radius-tag);
    background: var(--focsd-surface-sunk);
    font-weight: 400;
  }
  [part~='filter-indicator'] {
    display: inline-grid;
    color: var(--focsd-action);
  }
  [part~='filter-popover'],
  [part~='column-panel'] {
    ${floatingSurface}
    position: fixed;
    inset: auto;
    inline-size: 18rem;
    padding: var(--focsd-space-3);
    font: inherit;
  }
  [part~='filter-form'] {
    display: grid;
    gap: var(--focsd-space-2);
  }
  [part~='filter-label'] {
    font-weight: var(--focsd-text-label-weight);
  }
  [part~='filter-options'] {
    display: grid;
    gap: var(--focsd-space-1);
    max-block-size: 14rem;
    overflow: auto;
    margin: 0;
    padding: 0;
    border: 0;
  }
  [part~='filter-option'] {
    display: flex;
    align-items: center;
    gap: var(--focsd-space-2);
    min-block-size: 2rem;
  }
  [part~='filter-error'] {
    margin: 0;
    color: var(--focsd-critical);
    font-weight: var(--focsd-text-label-weight);
  }
  [part~='filter-error']:empty {
    display: none;
  }
  [part~='filter-actions'] {
    justify-content: flex-end;
  }
  [part~='panel-list'] {
    display: grid;
    gap: var(--focsd-space-1);
    max-block-size: 20rem;
    overflow: auto;
    margin: 0 0 var(--focsd-space-3);
    padding: 0;
    list-style: none;
  }
  [part~='panel-item'] {
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    align-items: center;
    gap: var(--focsd-space-2);
    min-block-size: 2.25rem;
  }
  [part~='panel-move'] {
    display: inline-grid;
    place-items: center;
    inline-size: 2rem;
    block-size: 2rem;
    padding: 0;
    border: var(--focsd-border-width) solid var(--focsd-edge-quiet);
    border-radius: var(--focsd-radius-control);
    background: var(--focsd-surface);
    color: var(--focsd-ink);
    cursor: pointer;
  }
  [part~='panel-move']:disabled {
    color: var(--focsd-ink-muted);
    cursor: not-allowed;
  }
  [part~='empty-state'] {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--focsd-space-2);
  }
  [part~='empty-state']:has([part~='empty']:empty) {
    display: none;
  }
  [part~='group-row'] > [part~='cell'] {
    background: var(--focsd-surface-sunk);
    font-weight: var(--focsd-text-label-weight);
  }
  [part~='group-toggle'] {
    display: inline-grid;
    flex: none;
  }
  [part~='aggregate'] {
    color: var(--focsd-ink);
  }
  [part~='editor'] {
    box-sizing: border-box;
    inline-size: 100%;
    min-block-size: 2rem;
    padding-inline: var(--focsd-space-2);
    border: calc(var(--focsd-border-width) * 2) solid var(--focsd-action);
    border-radius: var(--focsd-radius-control);
    background: var(--focsd-surface);
    color: var(--focsd-ink);
    font: inherit;
  }
  [part~='editor'][aria-invalid='true'] {
    border-color: var(--focsd-critical);
  }
  [part~='edit-error'] {
    position: absolute;
    inset-block-start: 100%;
    inset-inline-start: 0;
    z-index: var(--_z-edit-error);
    padding: var(--focsd-space-1) var(--focsd-space-2);
    border-radius: var(--focsd-radius-control);
    background: var(--focsd-critical);
    color: var(--focsd-on-action);
    font-size: var(--focsd-text-label-size);
    white-space: nowrap;
  }
  [part~='cell']:has([part~='editor']) {
    position: relative;
    overflow: visible;
    padding-inline: var(--focsd-space-1);
  }
  @media (forced-colors: active) {
    [part~='row'][aria-selected='true'] > [part~='cell'] {
      outline: 2px solid Highlight;
      outline-offset: -2px;
    }
  }
`;

/** Popups enter like every Focsd popover; cells and buttons share the hover color motion (m7). */
export const gridStyles = [
  gridRules,
  enterMotion("[part~='column-menu']"),
  enterMotion("[part~='filter-popover'], [part~='column-panel']"),
  hoverMotion("[part~='cell'], [part~='header-cell'], [part~='toolbar-button'], [part~='filter-button'], [part~='chip-button']"),
];
