import { css } from 'lit';

/** 14.0 layout (label positions) and messages, shared by every form control. */
export const fieldLayoutStyles = css`
  [part~='layout'] {
    display: flex;
    flex-wrap: wrap;
    align-items: start;
    column-gap: var(--focsd-space-3);
    row-gap: var(--focsd-space-1);
  }
  [part~='layout'][data-position='top'] {
    flex-direction: column;
    align-items: stretch;
  }
  /* No label text (the control is named by aria-label): no row for it, so no gap above the control. */
  [part~='label']:empty {
    display: none;
  }
  [part~='layout'][data-position='start'] > [part~='label'],
  [part~='layout'][data-position='end'] > [part~='label'] {
    flex: 0 1 var(--focsd-field-label-width, 12rem);
    overflow-wrap: anywhere;
    /* Puts the first label line level with the text of a one-line control (spec: align to the first line). */
    padding-block-start: max(0px, calc((var(--focsd-control-height) - 1lh) / 2));
  }
  [part~='layout'][data-position='end'] > [part~='label'] {
    order: 1;
  }
  [part~='layout'][data-position='start'] > [part~='body'],
  [part~='layout'][data-position='end'] > [part~='body'] {
    flex: 1 1 calc(var(--focsd-field-side-min, 32rem) - var(--focsd-field-label-width, 12rem) - var(--focsd-space-3));
    min-inline-size: 0;
  }
  [part~='body'] {
    display: grid;
    gap: var(--focsd-space-1);
  }
  [part~='hint'],
  [part~='message'] {
    margin: 0;
    font-size: var(--focsd-text-label-size);
    line-height: var(--focsd-text-label-line-height);
  }
  [part~='hint'] {
    color: var(--focsd-ink-muted);
  }
  [part~='message'] {
    display: flex;
    gap: var(--focsd-space-1);
    align-items: start;
    font-weight: var(--focsd-text-label-weight);
  }
  [part~='message-icon'] svg {
    inline-size: 1em;
    block-size: 1em;
    margin-block-start: 0.15em;
  }
  [part~='message'][part~='error'] {
    color: var(--focsd-critical);
  }
  [part~='message'][part~='warning'] {
    color: var(--focsd-caution);
  }
  [part~='message'][part~='success'] {
    color: var(--focsd-positive);
  }
  /* Attribute fallbacks, only for engines without plain-name custom states (CSS cannot trim, so
     these would also match a blank attribute). Error comes last, so it wins. */
  @supports not selector(:state(error)) {
    :host([success]:not([success=''])) {
      --focsd-field-border-color: var(--focsd-positive);
    }
    :host([warning]:not([warning=''])) {
      --focsd-field-border-color: var(--focsd-caution);
    }
    :host([error]:not([error=''])) {
      --focsd-field-border-color: var(--focsd-critical);
    }
  }
  :host(:state(error)) {
    --focsd-field-border-color: var(--focsd-critical);
  }
  :host(:state(warning)) {
    --focsd-field-border-color: var(--focsd-caution);
  }
  :host(:state(success)) {
    --focsd-field-border-color: var(--focsd-positive);
  }
`;
