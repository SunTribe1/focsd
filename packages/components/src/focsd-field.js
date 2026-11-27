import { css, unsafeCSS } from 'lit';
import { FocsdFieldBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { fieldLayoutStyles } from '@focsd/primitives/styles/field-layout.js';

/** Native inputs that take the shared text-control look; checkboxes, radios, ranges, color, file and button inputs keep their own. */
const textInput = unsafeCSS(
  "input:not([type='checkbox'], [type='radio'], [type='range'], [type='color'], [type='file'], [type='hidden'], " +
    "[type='submit'], [type='button'], [type='reset'], [type='image'])",
);

export class FocsdField extends FocsdFieldBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdFieldBase.styles,
    hostStyles,
    fieldLayoutStyles,
    css`
      :host {
        display: block;
      }
      /* The wrapped control's border follows the shown message (error over warning over success). */
      :host([success]:not([success=''])) {
        --focsd-field-border-color: var(--focsd-positive);
      }
      :host([warning]:not([warning=''])) {
        --focsd-field-border-color: var(--focsd-caution);
      }
      :host([error]:not([error=''])) {
        --focsd-field-border-color: var(--focsd-critical);
      }
      /* A baseline for the control you wrap, so a native or plain control looks like every Focsd field:
         the same padding, border, radius, height and background. The border follows the field's state
         (error, warning, success), at 1px. Checkboxes, radios, ranges, color and file inputs keep their own look. */
      ::slotted(${textInput}),
      ::slotted(select),
      ::slotted(textarea),
      ::slotted([role='textbox']) {
        box-sizing: border-box;
        inline-size: 100%;
        min-block-size: var(--focsd-control-height);
        margin: 0;
        padding: var(--focsd-space-2) var(--focsd-space-3);
        border: var(--focsd-border-width) solid var(--focsd-field-border-color, var(--focsd-edge));
        border-radius: var(--focsd-field-radius, var(--focsd-radius-control));
        background-color: var(--focsd-field-background, var(--focsd-surface));
        color: var(--focsd-ink);
        font: inherit;
        font-size: var(--focsd-text-body-size);
        line-height: var(--focsd-text-body-line-height);
      }
      ::slotted(textarea),
      ::slotted([role='textbox'][aria-multiline='true']) {
        min-block-size: 5.5rem;
        resize: vertical;
      }
      /* A select draws its own chevron, inset from the edge like the Focsd select's. */
      ::slotted(select) {
        appearance: none;
        padding-inline-end: calc(var(--focsd-space-3) + 1.5rem);
        /* A thin chevron from two diagonal strokes (currentColor, so it follows the theme), matching focsd-select. */
        background-image:
          linear-gradient(45deg, transparent 42%, currentColor 42% 58%, transparent 58%),
          linear-gradient(-45deg, transparent 42%, currentColor 42% 58%, transparent 58%);
        background-position:
          calc(100% - var(--focsd-space-3) - 0.4rem) 55%,
          calc(100% - var(--focsd-space-3)) 55%;
        background-size: 0.42rem 0.42rem;
        background-repeat: no-repeat;
      }
      ::slotted(${textInput}:focus-visible),
      ::slotted(select:focus-visible),
      ::slotted(textarea:focus-visible),
      ::slotted([role='textbox']:focus-visible) {
        outline: 2px solid transparent;
        box-shadow: var(--focsd-focus-ring);
      }
      ::slotted(${textInput})::placeholder,
      ::slotted(select)::placeholder,
      ::slotted(textarea)::placeholder,
      ::slotted([role='textbox'])::placeholder {
        color: var(--focsd-ink-muted);
        opacity: 1;
      }
      [part~='label'] {
        font-size: var(--focsd-text-small-size);
        font-weight: var(--focsd-text-label-weight);
        line-height: var(--focsd-text-small-line-height);
      }
      [part~='marker'] {
        margin-inline-start: var(--focsd-space-1);
        color: var(--focsd-critical);
      }
      ::slotted([data-focsd-field='hint']),
      ::slotted([data-focsd-field='message']) {
        margin: 0;
        font-size: var(--focsd-text-label-size);
        line-height: var(--focsd-text-label-line-height);
      }
      ::slotted([data-focsd-field='hint']) {
        color: var(--focsd-ink-muted);
      }
      ::slotted([data-focsd-field='message']) {
        display: flex;
        gap: var(--focsd-space-1);
        align-items: start;
        font-weight: var(--focsd-text-label-weight);
      }
      ::slotted([data-focsd-field='message'][data-state='error']) {
        color: var(--focsd-critical);
      }
      ::slotted([data-focsd-field='message'][data-state='warning']) {
        color: var(--focsd-caution);
      }
      ::slotted([data-focsd-field='message'][data-state='success']) {
        color: var(--focsd-positive);
      }
    `,
  ];
}

defineElement('focsd-field', FocsdField);
