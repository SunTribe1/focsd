import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { floorCssText } from '../src/floor.styles.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

/** The declarations of a rule body, normalized: one `prop: value` per entry, in order. */
const declarations = (text) =>
  text
    .split(';')
    .map((d) => d.trim().replaceAll(/\s+/g, ' '))
    .filter(Boolean);

describe('@focsd-dev/primitives/styles (Q14)', () => {
  it('is a public export, so grid, charts and editor can share the component styles', () => {
    expect(pkg.exports['./styles/*.js']).toEqual({
      types: './types/styles/*.d.ts',
      development: './src/styles/*.js',
      default: './dist/styles/*.js',
    });
  });

  it('resolves through the package name', async () => {
    const listbox = await import('@focsd-dev/primitives/styles/listbox.js');
    const surface = await import('@focsd-dev/primitives/styles/surface.js');
    expect(Object.keys(listbox).toSorted()).toEqual(
      [
        'activeOption',
        'groupLabel',
        'groupRule',
        'listboxClearStyles',
        'listboxGroupStyles',
        'listboxOptionStyles',
        'listboxPopup',
        'optionBox',
        'selectedOption',
        'selectedOptionForced',
      ].toSorted(),
    );
    expect(surface.floatingSurface.cssText).toContain('var(--focsd-shadow-overlay)');
  });
});

describe('listbox styles (Q15)', () => {
  it('draws the active option with the inset two-tone ring token and a forced-colors outline', async () => {
    const { activeOption } = await import('../src/styles/listbox.js');
    const { cssText } = activeOption("[part~='active']");
    expect(cssText).toContain('var(--focsd-focus-ring-inset);');
    expect(cssText).toMatch(/@media \(forced-colors: active\)[\s\S]*outline-color: Highlight/);
  });

  it('marks the selected option with an inset selection bar, keeping its width in the padding (m6)', async () => {
    const { optionBox, selectedOption, selectedOptionForced, activeOption } = await import('../src/styles/listbox.js');
    expect(optionBox.cssText).toContain(
      'padding-inline: calc(var(--focsd-space-3) + var(--focsd-selection-bar-width)) var(--focsd-space-3)',
    );
    expect(optionBox.cssText).not.toContain('border-inline-start');
    expect(selectedOption.cssText).toContain('--_selection-bar: inset var(--_inline-bar) 0 0 var(--focsd-action)');
    expect(selectedOptionForced.cssText).toContain('solid Highlight');
    expect(activeOption('a').cssText).toContain('box-shadow: var(--_selection-bar, 0 0 transparent), var(--focsd-focus-ring-inset)');
  });
});

describe('visually hidden (m9)', () => {
  it('the shared fragment and the floor utility class are the same recipe', async () => {
    const { visuallyHidden } = await import('../src/styles/shared.js');
    const floorRule = /\.focsd-visually-hidden \{([^}]*)\}/.exec(floorCssText)[1];
    expect(declarations(visuallyHidden.cssText)).toEqual(declarations(floorRule));
  });
});

describe('hover motion (m7, m8)', () => {
  it('fades paint only, and adds transform only for pressed buttons', async () => {
    const { hoverMotion } = await import('../src/styles/motion.js');
    expect(hoverMotion('a').cssText).not.toContain('transform');
    expect(hoverMotion('a', { press: true }).cssText).toContain('transform var(--focsd-duration-quick)');
    expect(hoverMotion('a').cssText).not.toMatch(/box-shadow|outline/);
  });
});
