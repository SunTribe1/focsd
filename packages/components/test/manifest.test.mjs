import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const manifest = JSON.parse(await readFile(new URL('../custom-elements.json', import.meta.url), 'utf8'));
const declarations = manifest.modules.flatMap((m) => m.declarations ?? []).filter((d) => d.customElement && d.tagName);
const byTag = Object.fromEntries(declarations.map((d) => [d.tagName, d]));
const attrs = (tag) => (byTag[tag]?.attributes ?? []).map((a) => a.name);

const wave14 = [
  'focsd-field',
  'focsd-date-field',
  'focsd-listbox',
  'focsd-date-time-picker',
  'focsd-swatch-picker',
  'focsd-editable',
  'focsd-split-button',
  'focsd-tour',
  'focsd-toggletip',
  'focsd-qr-code',
  'focsd-copy-button',
  'focsd-loading-overlay',
  'focsd-format-number',
  'focsd-relative-time',
  'focsd-app-shell',
  'focsd-table-of-contents',
  'focsd-splitter-pane',
];

const wave1 = [
  'focsd-button',
  'focsd-dialog',
  'focsd-option',
  'focsd-select',
  'focsd-tab',
  'focsd-tab-panel',
  'focsd-tabs',
  'focsd-text-field',
];

const wave2 = [
  'focsd-alert',
  'focsd-avatar',
  'focsd-avatar-group',
  'focsd-badge',
  'focsd-card',
  'focsd-icon',
  'focsd-kbd',
  'focsd-link',
  'focsd-meter',
  'focsd-progress',
  'focsd-separator',
  'focsd-skeleton',
  'focsd-skip-link',
  'focsd-spinner',
  'focsd-tag',
  'focsd-visually-hidden',
];

const wave3 = [
  'focsd-textarea',
  'focsd-checkbox',
  'focsd-checkbox-group',
  'focsd-fieldset',
  'focsd-radio',
  'focsd-radio-group',
  'focsd-switch',
  'focsd-number-field',
  'focsd-search-field',
  'focsd-password-field',
  'focsd-otp-field',
  'focsd-slider',
  'focsd-error-summary',
  'focsd-rating',
  'focsd-toggle',
  'focsd-toggle-group',
  'focsd-icon-button',
  'focsd-button-group',
];

const wave16 = ['focsd-theme-toggle', 'focsd-theme-picker'];

const wave18 = ['focsd-stat', 'focsd-animated-number', 'focsd-status-dot'];

const wave21a = ['focsd-segmented-control', 'focsd-segment', 'focsd-bottom-nav', 'focsd-bottom-nav-item'];

const dock = ['focsd-dock', 'focsd-dock-item'];

const wave21bcd = ['focsd-lightbox', 'focsd-image-compare', 'focsd-signature-pad', 'focsd-notification-center', 'focsd-notification'];

describe('custom-elements.json', () => {
  it('lists every built tag', () => {
    const wave4 = [
      'focsd-popover',
      'focsd-floating-panel',
      'focsd-tooltip',
      'focsd-menu',
      'focsd-menu-item',
      'focsd-context-menu',
      'focsd-alert-dialog',
      'focsd-drawer',
      'focsd-toaster',
      'focsd-accordion',
      'focsd-accordion-item',
      'focsd-disclosure',
    ];

    const wave5 = [
      'focsd-breadcrumb',
      'focsd-breadcrumb-item',
      'focsd-pagination',
      'focsd-nav-menu',
      'focsd-nav-item',
      'focsd-sidebar',
      'focsd-sidebar-item',
      'focsd-menubar',
      'focsd-menubar-item',
      'focsd-stepper',
      'focsd-step',
      'focsd-header',
      'focsd-toolbar',
      'focsd-list',
      'focsd-list-item',
      'focsd-description-list',
      'focsd-description-item',
    ];

    const wave6 = [
      'focsd-table',
      'focsd-tree',
      'focsd-tree-item',
      'focsd-timeline',
      'focsd-timeline-item',
      'focsd-empty-state',
      'focsd-code',
      'focsd-image',
      'focsd-scroll-area',
      'focsd-splitter',
      'focsd-carousel',
      'focsd-carousel-slide',
    ];

    const wave7 = [
      'focsd-combobox',
      'focsd-multi-select',
      'focsd-option-group',
      'focsd-command',
      'focsd-command-item',
      'focsd-calendar',
      'focsd-date-picker',
      'focsd-date-range-picker',
      'focsd-time-field',
      'focsd-file-upload',
    ];

    const wave8 = ['focsd-footer', 'focsd-footer-section'];

    const wave13 = [
      'focsd-color-picker',
      'focsd-tag-input',
      'focsd-phone-field',
      'focsd-currency-field',
      'focsd-hover-card',
      'focsd-bottom-sheet',
      'focsd-virtual-list',
      'focsd-masonry',
    ];

    expect(Object.keys(byTag).toSorted()).toEqual(
      [
        ...wave1,
        ...wave2,
        ...wave3,
        ...wave4,
        ...wave5,
        ...wave6,
        ...wave7,
        ...wave8,
        ...wave13,
        ...wave14,
        ...wave16,
        ...wave18,
        ...wave21a,
        ...wave21bcd,
        ...dock,
      ].toSorted(),
    );
  });

  it('includes inherited attributes from the headless bases', () => {
    expect(attrs('focsd-button')).toEqual(expect.arrayContaining(['variant', 'type', 'disabled']));
    expect(attrs('focsd-text-field')).toEqual(expect.arrayContaining(['label', 'hint', 'error', 'value', 'name', 'required']));
    expect(attrs('focsd-select')).toEqual(expect.arrayContaining(['label', 'value', 'placeholder', 'name', 'required']));
    expect(attrs('focsd-dialog')).toEqual(expect.arrayContaining(['headline', 'open']));
  });
});

describe('public API', () => {
  it('does not expose menu toggle internals', () => {
    const members = (byTag['focsd-menu']?.members ?? []).map((m) => m.name);
    expect(members).not.toContain('onToggle');
    expect(members).not.toContain('onBeforeToggle');
  });
});

describe('form-control helpers for subclasses (B8)', () => {
  it('emitValue and idrefText stay out of the framework typings (like ariaTarget and invalidTargets)', async () => {
    const files = ['jsx.d.ts', 'vue.d.ts', 'svelte.d.ts', 'react.d.ts'];

    for (const file of files) {
      const text = await readFile(new URL(`../types/${file}`, import.meta.url), 'utf8').catch(() => '');

      expect(text, file).not.toMatch(/\b(emitValue|idrefText)\b/);
    }
  });
});
