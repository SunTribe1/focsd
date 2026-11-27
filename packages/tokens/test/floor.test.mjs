import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const floor = await readFile(new URL('../dist/floor.css', import.meta.url), 'utf8');

describe('floor.css', () => {
  it('draws the focus ring (gap and ink ring) with built-in fallbacks', () => {
    expect(floor).toContain('var(--focsd-focus-inner, #f4f6f5)');
    expect(floor).toContain('var(--focsd-focus-outer, #141a18)');
    expect(floor).toContain(':host(:focus-visible)');
    expect(floor).toContain('[part~="control"]:focus-visible');
  });
  it('keeps targets at least 24px', () => {
    expect(floor).toContain('min-block-size: var(--focsd-target-min, 24px)');
    expect(floor).toContain('min-inline-size: var(--focsd-target-min, 24px)');
  });
  it('handles forced colors and reduced motion', () => {
    expect(floor).toMatch(/@media \(forced-colors: active\)[\s\S]*outline: 3px solid Highlight/);
    expect(floor).toContain('@media (prefers-reduced-motion: reduce)');
  });
  it('draws the ring from the --focsd-focus-ring token when tokens.css is loaded (Q12)', () => {
    const rings = floor.match(
      /box-shadow: var\(--focsd-focus-ring, 0 0 0 1px var\(--focsd-focus-inner, #f4f6f5\), 0 0 0 2px var\(--focsd-focus-outer, #141a18\)\);/g,
    );

    expect(rings).toHaveLength(2);
  });
  it('recomposes both ring tokens on every host, so a focus color set on a wrapper reaches the ring (I1)', () => {
    const host = /^:host \{([^}]*)\}/m.exec(floor)[1];

    expect(host).toContain('--focsd-focus-ring: 0 0 0 1px var(--focsd-focus-inner, #f4f6f5), 0 0 0 2px var(--focsd-focus-outer, #141a18);');
    expect(host).toContain(
      '--focsd-focus-ring-inset: inset 0 0 0 1px var(--focsd-focus-outer, #141a18), inset 0 0 0 2px var(--focsd-focus-inner, #f4f6f5);',
    );
  });
  it('keeps the spinner animating under reduced motion, so the busy state still has a cue (Q18)', () => {
    const reduced = floor.split('@media (prefers-reduced-motion: reduce)')[1].split('\n}\n')[0];
    expect(reduced).toContain(`*:not([part~="spinner"])`);
    expect(reduced).not.toMatch(/^\s*\*,$/m);
  });
  it('provides a visually-hidden utility', () => {
    expect(floor).toContain('.focsd-visually-hidden');
  });
});
