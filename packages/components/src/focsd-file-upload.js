import { css } from 'lit';
import { FocsdFileUploadBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { fieldStyles } from '@focsd-dev/primitives/styles/field.js';
import { fieldLayoutStyles } from '@focsd-dev/primitives/styles/field-layout.js';
import { enterMotion, hoverMotion } from '@focsd-dev/primitives/styles/motion.js';
import { squareButton } from '@focsd-dev/primitives/styles/picker.js';

export class FocsdFileUpload extends FocsdFileUploadBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdFileUploadBase.styles,
    hostStyles,
    fieldStyles,
    fieldLayoutStyles,
    css`
      [part~='group'] { display: grid; gap: var(--focsd-space-2); }
      [part~='label'] { font-size: var(--focsd-text-small-size); font-weight: var(--focsd-text-label-weight); }
      [part~='dropzone'] {
        display: flex; flex-wrap: wrap; align-items: center; gap: var(--focsd-space-3); padding: var(--focsd-space-4);
        border: calc(var(--focsd-border-width) * 2) dashed var(--focsd-field-border-color, var(--focsd-edge));
        border-radius: var(--focsd-radius-surface);
        background: var(--focsd-surface);
      }
      [part~='dragging'] { border-color: var(--focsd-action); background: var(--focsd-surface-sunk); }
      [part~='trigger'] {
        display: inline-flex;
        align-items: center;
        gap: var(--focsd-space-2);
        min-block-size: var(--focsd-control-height);
        padding-inline: var(--focsd-space-4);
        border: var(--focsd-border-width) solid var(--focsd-edge);
        border-radius: var(--focsd-radius-control);
        background: var(--focsd-surface-raised);
        color: var(--focsd-ink); font: inherit; font-weight: var(--focsd-text-label-weight); cursor: pointer;
      }
      [part~='trigger']:hover { background: var(--focsd-surface-sunk); }
      [part~='drop-text'] { color: var(--focsd-ink-muted); }
      [part~='errors']:empty { display: none; }
      [part~='errors'] [part~='error'] { margin: 0; }
      [part~='files'] { display: grid; gap: var(--focsd-space-1); margin: 0; padding: 0; list-style: none; }
      [part~='file'] {
        display: flex; align-items: center; gap: var(--focsd-space-3); padding-inline-start: var(--focsd-space-3);
        border: var(--focsd-border-width) solid var(--focsd-edge-quiet); border-radius: var(--focsd-radius-control);
      }
      [part~='file-name'] { flex: 1; overflow-wrap: anywhere; }
      [part~='file-size'] { color: var(--focsd-ink-muted); font-family: var(--focsd-font-mono); font-size: var(--focsd-text-label-size); }
      [part~='remove'] { ${squareButton} border-color: transparent; background: transparent; }
      [part~='remove']:hover { background: var(--focsd-surface-sunk); }
      @media (forced-colors: active) { [part~='dragging'] { border-color: Highlight; } }
    `,
    hoverMotion("[part~='dropzone'], [part~='trigger'], [part~='remove']"),
    enterMotion("[part~='file']", { from: 'translateY(4px)' }),
  ];
}

defineElement('focsd-file-upload', FocsdFileUpload);
