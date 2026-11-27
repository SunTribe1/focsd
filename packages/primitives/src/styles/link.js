import { css } from 'lit';

export const linkStyles = css`
  [part~='link'] {
    color: var(--focsd-link-color, var(--focsd-route));
    text-decoration: underline;
    text-underline-offset: 0.18em;
    text-decoration-thickness: 1px;
    border-radius: 2px;
  }
  [part~='link']:hover {
    text-decoration-thickness: 2px;
  }
  [part~='icon'] {
    margin-inline-start: 0.2em;
    vertical-align: -0.1em;
    font-size: 0.85em;
  }
`;
