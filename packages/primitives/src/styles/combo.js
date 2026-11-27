import { css } from 'lit';
import { activeOption, listboxClearStyles, listboxGroupStyles, listboxOptionStyles, listboxPopup } from './listbox.js';

/** Field with inline tags and a listbox popup, shared by the combobox family and the tag input. */
export const comboStyles = css`
  ${listboxGroupStyles}
  ${listboxClearStyles}
  ${listboxOptionStyles}
  ${activeOption("[part~='active']")}
  [part~='field'] {
    anchor-name: --_combobox-anchor;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--focsd-space-1);
  }
  [part~='field'] [part~='control'] { flex: 1; min-inline-size: 8rem; }
  [part~='popup'] {
    ${listboxPopup('--_combobox-anchor')}
  }
  [part~='listbox'] { overscroll-behavior: contain; }
  [part~='select-all'] { color: var(--focsd-route); font-size: var(--focsd-text-small-size); font-weight: var(--focsd-text-label-weight); }
  [part~='select-all'][aria-selected='true'] { --_selection-bar: 0 0 transparent; }
  [part~='tags'] { display: contents; list-style: none; }
  [part~='tag'] {
    display: inline-flex; align-items: center; gap: var(--focsd-space-1);
    padding-inline-start: var(--focsd-space-2); border: var(--focsd-border-width) solid var(--focsd-edge);
    border-radius: var(--focsd-radius-tag); background: var(--focsd-surface-sunk); font-size: var(--focsd-text-small-size);
  }
  [part~='remove'] {
    display: inline-grid; place-items: center; min-inline-size: var(--focsd-target-min); min-block-size: var(--focsd-target-min);
    border: 0; background: transparent; color: var(--focsd-ink); cursor: pointer;
  }
`;

/**
 * The bordered box of a field that holds tags and a text input (tag input, multi-select): the tags
 * and the input sit inside one box with the field's border, state color and focus ring; the input
 * itself is borderless.
 */
export const taggedFieldStyles = css`
      [part~='field'] {
        box-sizing: border-box;
        min-block-size: var(--focsd-control-height);
        padding: var(--focsd-space-1) var(--focsd-space-2);
        background: var(--focsd-field-background, var(--focsd-surface));
        border: var(--focsd-border-width) solid var(--focsd-field-border-color, var(--focsd-edge));
        border-radius: var(--focsd-field-radius, var(--focsd-radius-control));
      }
      [part~='field']:focus-within {
        border-color: var(--focsd-ink);
      }
      /* Keyboard focus rings the whole field (as on every text field), not the input inside it. */
      [part~='field']:has([part~='control']:focus-visible) {
        outline: 2px solid transparent;
        box-shadow: var(--focsd-focus-ring);
      }
      [part~='field'] [part~='control']:focus-visible {
        box-shadow: none;
      }
      [part~='tags'] {
        margin: 0;
        padding: 0;
      }
      [part~='field'] [part~='control'] {
        min-block-size: calc(var(--focsd-control-height) - 2 * var(--focsd-space-1) - 2 * var(--focsd-border-width));
        padding-inline: var(--focsd-space-1);
        border: 0;
        background: transparent;
        outline: none;
        box-shadow: none;
      }
      /* field.js styles the inner input for an error; the error shows on the outer box instead. */
      @supports not selector(:state(error)) {
        :host([error]:not([error=''])) [part~='field'] [part~='control'] {
          padding-inline: var(--focsd-space-1);
          border-width: 0;
        }
      }
      :host(:state(error)) [part~='field'] [part~='control'] {
        padding-inline: var(--focsd-space-1);
        border-width: 0;
      }
`;
