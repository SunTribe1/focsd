import { css } from 'lit';
import { FocsdTagInputBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { fieldStyles } from '@focsd-dev/primitives/styles/field.js';
import { comboStyles, taggedFieldStyles } from '@focsd-dev/primitives/styles/combo.js';
import { fieldLayoutStyles } from '@focsd-dev/primitives/styles/field-layout.js';
import { enterMotion, hoverMotion } from '@focsd-dev/primitives/styles/motion.js';
import './focsd-option.js';
import './focsd-option-group.js';

/** A styled tag input: typed values become removable tags, with optional suggestions and reordering. */
export class FocsdTagInput extends FocsdTagInputBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdTagInputBase.styles,
    hostStyles,
    fieldStyles,
    comboStyles,
    fieldLayoutStyles,
    taggedFieldStyles,
    css`
      [part~='tag']:has([part~='handle']) {
        padding-inline-start: 0;
      }
      [part~='handle'] {
        display: inline-grid;
        place-items: center;
        min-inline-size: var(--focsd-target-min);
        min-block-size: var(--focsd-target-min);
        padding: 0;
        border: 0;
        background: transparent;
        color: var(--focsd-ink-muted);
        cursor: grab;
        touch-action: none;
        user-select: none;
      }
      [part~='tag'][data-dragging] {
        box-shadow: var(--focsd-shadow-overlay);
      }
      [part~='tag'][data-dragging] [part~='handle'] {
        cursor: grabbing;
      }
      [data-sortable-placeholder] {
        box-sizing: border-box;
        list-style: none;
        border: var(--focsd-border-width) dashed var(--focsd-edge);
        border-radius: var(--focsd-radius-tag);
      }
      :host([disabled]) [part~='field'] {
        color: var(--focsd-ink-muted);
        cursor: not-allowed;
      }
    `,
    enterMotion("[part~='popup']:popover-open"),
    hoverMotion("[part~='option'], [part~='remove']"),
  ];
}

defineElement('focsd-tag-input', FocsdTagInput);
