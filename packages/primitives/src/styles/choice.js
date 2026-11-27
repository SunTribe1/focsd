import { css } from 'lit';

/** Layout shared by checkbox, radio and switch: control + label text on one line, 44px target. */
export const choiceStyles = css`
  :host {
    display: block;
  }
  [part~='label'] {
    display: inline-flex;
    align-items: center;
    gap: var(--focsd-space-3);
    min-block-size: var(--focsd-control-height);
    font-size: var(--focsd-text-body-size);
    cursor: pointer;
  }
  :host([disabled]) [part~='label'],
  :host(:disabled) [part~='label'] {
    color: var(--focsd-ink-muted);
    cursor: not-allowed;
  }
  /* 14.0: the label wrapper holds the input and the text; the position is a flex-direction swap. */
  [part~='body'] > [part~='label'] {
    justify-self: start;
  }
  [part~='label'][data-position='start'] {
    flex-direction: row-reverse;
  }
  [part~='label'][data-position='top'] {
    flex-direction: column-reverse;
    align-items: start;
    gap: var(--focsd-space-1);
    min-block-size: 0;
  }
`;
