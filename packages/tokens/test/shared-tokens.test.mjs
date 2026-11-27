import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { loadTokens } from '../lib/load.mjs';
import { THEMES, fullSet } from '../lib/passes.mjs';
import { cssName } from '../lib/names.mjs';
import { toCss } from '../lib/serialize.mjs';

/** CSS value of every system token for one theme × density, by custom property name without `--focsd-`. */
async function sysCss(theme, density) {
  const tokens = await loadTokens(fullSet(theme, density));

  return Object.fromEntries(
    tokens.filter((t) => t.path[0] === 'sys').map((t) => [cssName(t.path).slice('--focsd-'.length), toCss(t.value, t.type)]),
  );
}

const RING = '0 0 0 1px var(--focsd-focus-inner), 0 0 0 2px var(--focsd-focus-outer)';

const RING_INSET = 'inset 0 0 0 1px var(--focsd-focus-outer), inset 0 0 0 2px var(--focsd-focus-inner)';

// OD6 (quality B7): shared tokens that components and the floor used to hand-copy. None changes the visuals.
describe('shared style tokens', () => {
  it.each(THEMES)('%s theme defines the focus ring (gap, ink ring, soft halo) from the focus colors', async (theme) => {
    const css = await sysCss(theme, 'default');
    expect(css['focus-ring']).toBe(RING);
    expect(css['focus-ring-inset']).toBe(RING_INSET);
  });

  it('defines the sticky and skip-link layers on the layer scale', async () => {
    const css = await sysCss('light', 'default');
    const layer = (name) => Number(css[`layer-${name}`]);
    expect(layer('sticky')).toBe(10);
    expect(layer('sticky')).toBeLessThan(layer('popover'));
    expect(layer('skip-link')).toBeGreaterThan(layer('toast'));
  });

  it('defines the selection-bar width', async () => {
    expect((await sysCss('light', 'default'))['selection-bar-width']).toBe('3px');
  });

  it.each([
    ['default', '28px'],
    ['comfortable', '36px'],
    ['compact', '24px'],
  ])('%s density: the inner control is 8px shorter than a control and never below the target minimum', async (density, inner) => {
    const css = await sysCss('light', density);
    const px = (name) => Number.parseFloat(css[name]);
    expect(css['control-height-inner']).toBe(inner);
    expect(px('control-height-inner')).toBe(px('control-height') - 8);
    expect(px('control-height-inner')).toBeGreaterThanOrEqual(px('target-min'));
  });
});

describe('tokens.css', () => {
  it('redeclares the ring wherever the focus colors change, so a themed subtree gets its own ring colors', async () => {
    const css = await readFile(new URL('../dist/tokens.css', import.meta.url), 'utf8');
    const outer = css.match(/--focsd-focus-outer:/g) ?? [];
    expect(outer.length).toBeGreaterThan(0);
    expect(css.match(/--focsd-focus-ring:/g) ?? []).toHaveLength(outer.length);
    expect(css.match(/--focsd-focus-ring-inset:/g) ?? []).toHaveLength(outer.length);
  });
});
