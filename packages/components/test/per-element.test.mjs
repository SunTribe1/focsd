// One module per element (quality B11, Q33, owner decision S3): importing
// `@focsd-dev/components/focsd-<tag>.js` in a fresh process defines that tag and the parts it needs,
// nothing else; the old grouped files stay as bundles that define everything they used to.
import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { promisify } from 'node:util';
import process from 'node:process';
import { describe, expect, it } from 'vitest';

const run = promisify(execFile);
const probe = new URL('./fixtures/defined-tags.mjs', import.meta.url).pathname;
const cwd = new URL('..', import.meta.url).pathname;

const manifest = JSON.parse(readFileSync(new URL('../custom-elements.json', import.meta.url), 'utf8'));

const tags = [
  ...new Set(manifest.modules.flatMap((m) => m.declarations ?? []).flatMap((d) => (d.customElement && d.tagName ? [d.tagName] : []))),
].toSorted();

/** Parts an element module defines with its own tag: children it reads, or elements it renders. */
const PARTS = {
  'focsd-accordion': ['focsd-accordion-item'],
  'focsd-avatar-group': ['focsd-avatar'],
  'focsd-bottom-nav': ['focsd-bottom-nav-item'],
  'focsd-breadcrumb': ['focsd-breadcrumb-item'],
  'focsd-carousel': ['focsd-carousel-slide'],
  'focsd-checkbox-group': ['focsd-checkbox'],
  'focsd-code': ['focsd-copy-button'],
  'focsd-combobox': ['focsd-option', 'focsd-option-group'],
  'focsd-command': ['focsd-command-item'],
  'focsd-context-menu': ['focsd-menu-item'],
  'focsd-date-picker': ['focsd-calendar'],
  'focsd-date-range-picker': ['focsd-calendar'],
  'focsd-date-time-picker': ['focsd-calendar', 'focsd-time-field'],
  'focsd-description-list': ['focsd-description-item'],
  'focsd-editable': ['focsd-text-field', 'focsd-textarea'],
  'focsd-footer': ['focsd-footer-section'],
  'focsd-list': ['focsd-list-item'],
  'focsd-loading-overlay': ['focsd-spinner'],
  'focsd-listbox': ['focsd-option', 'focsd-option-group'],
  'focsd-dock': ['focsd-dock-item'],
  'focsd-menu': ['focsd-menu-item'],
  'focsd-menubar': ['focsd-menubar-item', 'focsd-menu-item'],
  'focsd-menubar-item': ['focsd-menu-item'],
  'focsd-multi-select': ['focsd-option', 'focsd-option-group'],
  'focsd-nav-menu': ['focsd-nav-item'],
  'focsd-notification-center': ['focsd-icon-button', 'focsd-notification', 'focsd-relative-time'],
  'focsd-option-group': ['focsd-option'],
  'focsd-radio-group': ['focsd-radio'],
  'focsd-segmented-control': ['focsd-segment'],
  'focsd-select': ['focsd-option', 'focsd-option-group'],
  'focsd-sidebar': ['focsd-sidebar-item'],
  'focsd-split-button': ['focsd-button', 'focsd-menu-item'],
  'focsd-splitter': ['focsd-splitter-pane'],
  'focsd-stat': ['focsd-animated-number'],
  'focsd-stepper': ['focsd-step'],
  'focsd-swatch-picker': ['focsd-color-picker', 'focsd-option'],
  'focsd-tabs': ['focsd-tab', 'focsd-tab-panel'],
  'focsd-tag-input': ['focsd-option', 'focsd-option-group'],
  'focsd-timeline': ['focsd-timeline-item'],
  'focsd-toggle-group': ['focsd-toggle'],
  'focsd-tree': ['focsd-tree-item'],
};

/** The grouped files kept as bundles, with every tag each defined before the split. */
const BUNDLES = {
  'focsd-structure.js': [
    'focsd-step',
    'focsd-stepper',
    'focsd-header',
    'focsd-footer-section',
    'focsd-footer',
    'focsd-toolbar',
    'focsd-list-item',
    'focsd-list',
    'focsd-description-item',
    'focsd-description-list',
  ],
  'focsd-data.js': [
    'focsd-table',
    'focsd-tree-item',
    'focsd-tree',
    'focsd-timeline-item',
    'focsd-timeline',
    'focsd-empty-state',
    'focsd-code',
    'focsd-image',
    'focsd-scroll-area',
    'focsd-splitter',
    'focsd-splitter-pane',
    'focsd-carousel-slide',
    'focsd-carousel',
  ],
  'focsd-navigation.js': [
    'focsd-breadcrumb-item',
    'focsd-breadcrumb',
    'focsd-pagination',
    'focsd-nav-item',
    'focsd-nav-menu',
    'focsd-sidebar-item',
    'focsd-sidebar',
    'focsd-menubar-item',
    'focsd-menubar',
  ],
  'focsd-feedback.js': ['focsd-progress', 'focsd-meter', 'focsd-spinner', 'focsd-skeleton'],
  'focsd-date.js': ['focsd-calendar', 'focsd-date-picker', 'focsd-date-range-picker', 'focsd-time-field', 'focsd-file-upload'],
};

/**
 * Tags defined by importing `file` from the package, in a new Node process.
 * @param {string} file
 * @returns {Promise<string[]>}
 */
async function definedBy(file) {
  const { stdout } = await run(process.execPath, ['--conditions=development', probe, `@focsd-dev/components/${file}`], { cwd });

  return JSON.parse(stdout);
}

/** @param {string} tag */
const expected = (tag) => [...new Set([tag, ...(PARTS[tag] ?? [])])].toSorted();

describe('one module per element', () => {
  it('finds the elements', () => {
    expect(tags.length).toBeGreaterThan(80);
  });

  it.concurrent.each(tags)('focsd-<tag>.js defines only %s and its parts', async (tag) => {
    expect(await definedBy(`${tag}.js`)).toEqual(expected(tag));
  });

  it.concurrent.each(Object.entries(BUNDLES))('%s still defines every element it grouped', async (file, grouped) => {
    expect(await definedBy(file)).toEqual(expect.arrayContaining(grouped));
  });

  it('the package index defines every element', async () => {
    expect(await definedBy('index.js')).toEqual(tags);
  });
});
