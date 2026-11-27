import { describe, expect, it } from 'vitest';
import { loadTokens } from '../lib/load.mjs';
import { BASE, DENSITIES, REF, THEMES, densityFile, fullSet, themeFile } from '../lib/passes.mjs';
import { checkParity } from '../lib/checks/parity.mjs';
import { checkHygiene } from '../lib/checks/hygiene.mjs';
import { colorToHexFallback, toCss } from '../lib/serialize.mjs';

// [name, light, dark, contrast] — spec §6.1 / DESIGN.md
const EXPECTED = [
  ['ground', '#f4f6f5', '#111113', '#ffffff'],
  ['surface', '#ffffff', '#1a1a1d', '#ffffff'],
  ['surface-sunk', '#ebefed', '#0b0b0c', '#ffffff'],
  ['surface-raised', '#ffffff', '#1a1a1d', '#ffffff'],
  ['ink', '#141a18', '#ececee', '#000000'],
  ['ink-muted', '#4b5754', '#a1a1aa', '#000000'],
  ['edge', '#7d8985', '#71717a', '#000000'],
  ['edge-quiet', '#d3dad7', '#2a2a2f', '#000000'],
  ['action', '#141a18', '#ececee', '#000000'],
  ['action-hover', '#2c3532', '#ffffff', '#000000'],
  ['action-press', '#0c0f0e', '#d4d4d8', '#000000'],
  ['on-action', '#ffffff', '#111113', '#ffffff'],
  ['route', '#0a5e73', '#78c6de', '#00007a'],
  ['positive', '#1b6b3a', '#6cc98a', '#004d1f'],
  ['positive-tint', '#e3f1e8', '#15291d', '#ffffff'],
  ['caution', '#855400', '#edb24e', '#5c3a00'],
  ['caution-tint', '#fbf0d9', '#2e2412', '#ffffff'],
  ['critical', '#b0302a', '#f28b82', '#8a0000'],
  ['critical-tint', '#f9e6e4', '#33191a', '#ffffff'],
  ['focus-outer', '#141a18', '#ececee', '#000000'],
  ['focus-inner', '#f4f6f5', '#111113', '#ffffff'],
  ['scrim', '#141a187a', '#000000a8', '#000000bf'],
  ['hatch', '#141a181a', '#e7ecea1f', '#00000040'],
];

/** Roles that copy another role in the default themes (colorful presets such as Prismatic set their own). */
const ALIASES = [
  ['info', 'route'],
  ['info-tint', 'surface-sunk'],
  ...[1, 2, 3, 4, 5, 6, 7, 8].flatMap((n) => [
    [`accent-${n}`, 'ink-muted'],
    [`accent-${n}-tint`, 'surface-sunk'],
  ]),
];

EXPECTED.push(...ALIASES.map(([name, of]) => [name, ...(EXPECTED.find(([role]) => role === of) ?? []).slice(1)]));

const colorsOf = (tokens) =>
  Object.fromEntries(
    tokens.filter((t) => t.path[0] === 'sys' && t.path[1] === 'color').map((t) => [t.path.slice(2).join('-'), colorToHexFallback(t.value)]),
  );

describe('system colors', () => {
  it.each(THEMES.map((theme, i) => [theme, i + 1]))('%s theme matches DESIGN.md', async (theme, col) => {
    const colors = colorsOf(await loadTokens(fullSet(theme, 'comfortable')));

    for (const row of EXPECTED) expect(colors[row[0]], `${theme} ${row[0]}`).toBe(row[col]);
    expect(Object.keys(colors).toSorted()).toEqual(EXPECTED.map((r) => r[0]).toSorted());
  });

  it('contrast theme drops overlay shadows and doubles border width', async () => {
    const tokens = await loadTokens(fullSet('contrast', 'comfortable'));
    const byPath = Object.fromEntries(tokens.map((t) => [t.path.join('.'), t]));
    expect(toCss(byPath['sys.shadow.overlay'].value, 'shadow')).toBe('none');
    expect(toCss(byPath['sys.border.width'].value, 'dimension')).toBe('2px');
  });
});

describe('density', () => {
  it.each([
    // density, control height, body, small (buttons, labels), inline padding, indicator (checkbox/radio)
    ['default', '36px', '0.9375rem', '0.875rem', '16px', '1rem'],
    ['comfortable', '44px', '1.0625rem', '0.9375rem', '24px', '1.25rem'],
    ['compact', '32px', '0.875rem', '0.8125rem', '12px', '0.875rem'],
  ])('%s', async (density, height, body, small, inline, indicator) => {
    const tokens = await loadTokens(fullSet('light', density));
    const css = Object.fromEntries(tokens.map((t) => [t.path.join('.'), toCss(t.value, t.type)]));
    expect(css['sys.control.height']).toBe(height);
    expect(css['sys.text.body.size']).toBe(body);
    expect(css['sys.text.small.size']).toBe(small);
    expect(css['sys.space.inline-control']).toBe(inline);
    expect(css['sys.control.indicator']).toBe(indicator);
    expect(css['sys.target.min']).toBe('24px');
  });
});

describe('text zoom (Review Focus 5)', () => {
  it('every text size is rem or a clamp() containing rem', async () => {
    for (const density of DENSITIES) {
      const tokens = await loadTokens(fullSet('light', density));
      const sizes = tokens.filter((t) => t.path[1] === 'text' && t.path[3] === 'size');
      expect(sizes.length).toBe(6);

      for (const t of sizes) expect(toCss(t.value, t.type), t.path.join('.')).toMatch(/rem/);

      for (const t of sizes) expect(toCss(t.value, t.type), t.path.join('.')).not.toMatch(/\dpx/);
    }
  });
});

describe('parity and hygiene on real sources', () => {
  it('every theme and every density defines the same keys', async () => {
    const themes = Object.fromEntries(
      await Promise.all(THEMES.map(async (t) => [t, await loadTokens({ include: REF, source: [themeFile(t)] })])),
    );

    const densities = Object.fromEntries(
      await Promise.all(DENSITIES.map(async (d) => [d, await loadTokens({ include: REF, source: [densityFile(d)] })])),
    );

    expect(checkParity(themes)).toEqual([]);
    expect(checkParity(densities)).toEqual([]);
  });

  it('system tokens reference only ref, and system colors are aliases', async () => {
    const files = [BASE, ...THEMES.map(themeFile), ...DENSITIES.map(densityFile)];

    for (const file of files) expect(checkHygiene(await loadTokens({ include: REF, source: [file] })), file).toEqual([]);
    expect(checkHygiene(await loadTokens({ source: REF }))).toEqual([]);
  });
});

describe('check functions catch broken input', () => {
  const tok = (path, original, type = 'color') => ({ path, type, value: null, original, extensions: {} });
  it('checkParity reports the missing key and context', () => {
    expect(checkParity({ light: [tok(['sys', 'color', 'ink'], '{ref.x}')], dark: [] })).toEqual(['dark is missing sys.color.ink']);
  });
  it('checkHygiene rejects sys→sys references, raw sys colors and ref aliases', () => {
    expect(checkHygiene([tok(['sys', 'color', 'action'], '{sys.color.ink}')])).toEqual([
      'sys.color.action references sys.color.ink; sys tokens may only reference ref',
    ]);
    expect(checkHygiene([tok(['sys', 'color', 'ink'], { colorSpace: 'oklch', components: [0, 0, 0], hex: '#000000' })])).toEqual([
      'sys.color.ink must alias a ref color, not a raw value',
    ]);
    expect(checkHygiene([tok(['ref', 'color', 'x'], '{ref.color.y}')])).toEqual([
      'ref.color.x references ref.color.y; ref tokens may only reference nothing',
    ]);
  });
});
