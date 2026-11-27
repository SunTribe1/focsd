import { css } from 'lit';
import { FocsdBreadcrumbItemBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';

const linkLike = css`
  color: var(--focsd-route);
  text-decoration: underline;
  text-underline-offset: 0.18em;
`;

export class FocsdBreadcrumbItem extends FocsdBreadcrumbItemBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdBreadcrumbItemBase.styles,
    hostStyles,
    css`
    :host { display: inline-flex; align-items: center; gap: var(--focsd-space-2); }
    :host(:first-child) [part~='separator'] { display: none; }
    [part~='separator'] { color: var(--focsd-ink-muted); }
    [part~='link'] { ${linkLike} }
    [part~='current'] { font-weight: var(--focsd-text-label-weight); }
    [part~='link'], [part~='current'] { display: inline-flex; align-items: center; gap: var(--focsd-space-1); }
  `,
  ];
}

defineElement('focsd-breadcrumb-item', FocsdBreadcrumbItem);
