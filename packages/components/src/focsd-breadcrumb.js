import { css } from 'lit';
import { FocsdBreadcrumbBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import './focsd-breadcrumb-item.js';

export class FocsdBreadcrumb extends FocsdBreadcrumbBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdBreadcrumbBase.styles,
    hostStyles,
    css`
    :host { display: block; }
    [part~='list'] {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--focsd-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: var(--focsd-text-small-size);
    }
  `,
  ];
}

defineElement('focsd-breadcrumb', FocsdBreadcrumb);
