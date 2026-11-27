import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { closure, moduleOf, normalizeName, tagsIn } from '../src/resolve.js';

const root = new URL('../../components/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('custom-elements.json', root), 'utf8'));
const read = (path) => readFileSync(new URL(`src/${path}`, root), 'utf8');

describe('resolve', () => {
  it('normalizes short names, tags and class names', () => {
    for (const name of ['button', 'focsd-button', 'Button', 'FocsdButton', ' BUTTON '])
      expect(normalizeName(name), name).toBe('focsd-button');
    expect(normalizeName('date-picker')).toBe('focsd-date-picker');
    expect(normalizeName('DatePicker')).toBe('focsd-date-picker');
  });

  it('finds the module that defines a tag, and the tags a module brings', () => {
    expect(moduleOf('focsd-button', manifest)).toBe('focsd-button.js');
    expect(moduleOf('focsd-option', manifest)).toBe('focsd-option.js');
    expect(moduleOf('focsd-nope', manifest)).toBeNull();
    expect(tagsIn('focsd-select.js', manifest)).toEqual(['focsd-select']);
  });

  it('follows relative imports only, starting file first, without duplicates', () => {
    const files = closure('focsd-select.js', read);
    expect(files[0]).toBe('focsd-select.js');
    expect(files).toEqual(expect.arrayContaining(['focsd-option.js', 'focsd-option-group.js']));
    expect(files.every((f) => !f.startsWith('@') && !f.startsWith('lit'))).toBe(true);
    expect(new Set(files).size).toBe(files.length);
  });

  it('terminates on import cycles and shares common files', () => {
    const sources = {
      'a.js': "import './b.js';",
      'b.js': "import { x } from './a.js';\nimport './styles/s.js';",
      'styles/s.js': "import { css } from 'lit';",
    };

    expect(closure('a.js', (p) => sources[p])).toEqual(['a.js', 'b.js', 'styles/s.js']);
    const calendar = closure('focsd-date-range-picker.js', read);
    expect(calendar).toContain('focsd-calendar.js');
  });
});
