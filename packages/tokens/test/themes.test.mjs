// Theme and density helpers (quality B10: owner decision S4, m58). The lists come from the same
// source as tokens.css, so a new theme reaches the helpers, the types and the MCP server at once.
import { describe, expect, it } from 'vitest';
import { DENSITIES, THEMES } from '../lib/passes.mjs';

const mod = await import('../dist/index.js');

/** An element stand-in that records attributes. */
function fakeRoot() {
  const attributes = new Map();

  return {
    attributes,
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: (name) => attributes.delete(name),
  };
}

describe('themes and densities', () => {
  it('lists every built theme and density, frozen', () => {
    expect(mod.themes).toEqual(THEMES);
    expect(mod.densities).toEqual(DENSITIES);
    expect(Object.isFrozen(mod.themes)).toBe(true);
    expect(Object.isFrozen(mod.densities)).toBe(true);
  });

  it('setTheme and setDensity set the data attributes tokens.css reads', () => {
    const root = fakeRoot();

    mod.setTheme('dark', root);
    mod.setDensity('compact', root);
    expect(root.attributes.get('data-focsd-theme')).toBe('dark');
    expect(root.attributes.get('data-focsd-density')).toBe('compact');
  });

  it('rejects an unknown theme or density', () => {
    const root = fakeRoot();

    expect(() => mod.setTheme('sepia', root)).toThrow('Unknown Focsd theme "sepia"');
    expect(() => mod.setDensity('cosy', root)).toThrow('Unknown Focsd density "cosy"');
    expect(root.attributes.size).toBe(0);
  });

  it('needs a root on the server, where there is no document', () => {
    expect(() => mod.setTheme('dark')).toThrow('no document');
  });
});
