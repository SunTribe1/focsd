import { css } from 'lit';

/** <fieldset>/<legend> group styles shared by focsd-fieldset and focsd-checkbox-group. */
export const fieldsetStyles = css`
  :host {
    display: block;
  }
  [part~='fieldset'] {
    display: grid;
    gap: var(--focsd-space-2);
    margin: 0;
    padding: 0;
    border: 0;
    min-inline-size: 0;
  }
  [part~='legend'] {
    padding: 0;
    margin-block-end: var(--focsd-space-1);
    font-size: var(--focsd-text-small-size);
    font-weight: var(--focsd-text-label-weight);
  }
  [part~='hint'],
  [part~='error'] {
    margin: 0;
    font-size: var(--focsd-text-label-size);
  }
  [part~='hint'] {
    color: var(--focsd-ink-muted);
  }
  [part~='error'] {
    color: var(--focsd-critical);
    font-weight: var(--focsd-text-label-weight);
  }
  [part~='items'] {
    display: grid;
    gap: var(--focsd-fieldset-gap, var(--focsd-space-1));
  }
`;
