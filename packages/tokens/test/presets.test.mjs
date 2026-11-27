import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTokens } from '../lib/load.mjs';
import { PRESETS, presetFile, presetSet } from '../lib/passes.mjs';
import { src } from '../lib/paths.mjs';
import { checkContrast, colorMap } from '../lib/checks/contrast.mjs';
import { checkHygiene } from '../lib/checks/hygiene.mjs';
import { ORDER, assemblePreset, assemblePresets, loadPresetPasses, presetsData } from '../lib/presets.mjs';
import { buildPreset } from '../scripts/gen-presets.mjs';
import { PRESET_DATA } from '../scripts/preset-palettes.mjs';

const spec = JSON.parse(await readFile(src('checks/contrast-pairs.json'), 'utf8'));
const dist = (f) => readFile(new URL(`../dist/${f}`, import.meta.url), 'utf8');
const MODES = ['light', 'dark'];
const PAIRS = PRESETS.flatMap((name) => MODES.map((theme) => [name, theme]));

// R2: the only sys keys a preset may declare.
const COLOR_KEYS = new Set([
  ...'ground surface surface-sunk surface-raised ink ink-muted edge edge-quiet focus-inner focus-outer action action-hover action-press on-action route positive positive-tint caution caution-tint critical critical-tint info info-tint scrim hatch'.split(
    ' ',
  ),
  // The eight category colors every theme declares (neutral outside colorful presets).
  ...[1, 2, 3, 4, 5, 6, 7, 8].flatMap((n) => [`accent-${n}`, `accent-${n}-tint`]),
]);

const BASE_KEYS = new Set(['font.sans', 'font.mono', 'radius.control', 'radius.surface', 'radius.tag']);

let passes;

beforeAll(async () => {
  passes = Object.fromEntries(await Promise.all(PRESETS.map(async (n) => [n, await loadPresetPasses(n)])));
});

describe('preset list', () => {
  it('is the R1 presets plus Prismatic, in order', () => {
    expect(PRESETS).toEqual(['harbor', 'signal', 'mineral', 'prismatic']);
  });
});

describe('contrast floor (R4)', () => {
  it.each(PAIRS)('%s %s passes every declared pair', async (name, theme) => {
    const colors = colorMap(await loadTokens(presetSet(name, theme)));
    expect(checkContrast(`${name}/${theme}`, colors, spec)).toEqual([]);
  });

  it.each(PRESETS)('%s actually re-brands the action color in light and dark', async (name) => {
    for (const theme of MODES) {
      const preset = colorMap(await loadTokens(presetSet(name, theme))).get('action');
      expect(preset.hex).not.toBe(['#141a18', '#e7ecea'][MODES.indexOf(theme)]);
    }
  });

  it.each(PRESETS)('%s has no purple or violet action (DESIGN.md)', async (name) => {
    const [, c, h] = colorMap(await loadTokens(presetSet(name, 'light'))).get('action').components;
    expect(c < 0.03 || h < 275 || h > 345, `hue ${h}`).toBe(true);
  });
});

describe('sources (R2, R3)', () => {
  it.each(PRESETS)('%s declares only allowlisted sys keys, the same in light and dark', (name) => {
    const { light, dark, base } = passes[name];
    const keys = (tokens) => tokens.map((t) => t.path.slice(2).join('-'));

    for (const tokens of [light, dark]) {
      expect(tokens.every((t) => t.path[0] === 'sys' && t.path[1] === 'color')).toBe(true);
      expect(keys(tokens).filter((k) => !COLOR_KEYS.has(k))).toEqual([]);
    }

    expect(keys(light)).toEqual(keys(dark));
    expect(base.map((t) => t.path.slice(1).join('.')).filter((k) => !BASE_KEYS.has(k))).toEqual([]);
    expect(base.every((t) => t.path[0] === 'sys')).toBe(true);
  });

  it.each(PRESETS)('%s ref palette is namespaced under ref.color.%s', (name) => {
    expect(passes[name].ref.length).toBeGreaterThan(0);
    expect(passes[name].ref.every((t) => t.path[0] === 'ref' && t.path[1] === 'color' && t.path[2] === name)).toBe(true);
  });

  it.each(PRESETS)('%s sys colors alias the preset ref palette only', (name) => {
    const { light, dark, base } = passes[name];
    expect(checkHygiene([...light, ...dark, ...base])).toEqual([]);

    for (const t of [...light, ...dark]) expect(t.original).toMatch(new RegExp(`^\\{ref\\.color\\.${name}\\.`));
  });

  it.each(PRESETS)('%s source files match the generator', async (name) => {
    const built = buildPreset(name);

    for (const part of ['ref', 'light', 'dark', 'base']) {
      expect(JSON.parse(await readFile(presetFile(name, part), 'utf8')), `${name}/${part}.json`).toEqual(built[part]);
    }
  });
});

const ruleBodies = (css, selectorStart) =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].flatMap(([, sel, body]) => (sel.trim().startsWith(selectorStart) ? [body] : []));

const props = (body) => [...body.matchAll(/(--focsd-[\w-]+):\s*([^;]+);/g)].map(([, p, v]) => [p, v.trim()]);

describe('assemblePreset (R5, R6, R8)', () => {
  it('matches the harbor snapshot', () => {
    expect(assemblePreset('harbor', passes.harbor)).toMatchSnapshot();
  });

  it.each(PRESETS)('%s starts with the layer order statement and stays in focsd.preset', (name) => {
    const css = assemblePreset(name, passes[name]);
    expect(css.startsWith(`${ORDER}\n`)).toBe(true);
    expect(ORDER).toBe('@layer focsd.tokens, focsd.preset, focsd.brand;');
    expect(css).toContain('@layer focsd.preset {');
    expect(css).not.toMatch(/url\(|@font-face|@import/);
  });

  it.each(PRESETS)('%s switches by attribute, nested theme and OS preference', (name) => {
    const css = assemblePreset(name, passes[name]);
    const b = `[data-focsd-brand="${name}"]`;
    expect(css).toContain(`${b},\n  ${b} [data-focsd-theme="light"] {`);
    expect(css).toContain(`${b}[data-focsd-theme="dark"],\n  ${b} [data-focsd-theme="dark"] {`);
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\) \{\n\s+\[data-focsd-brand="[a-z]+"\]:not\(\[data-focsd-theme\]\) \{/);
    expect(css.indexOf('prefers-color-scheme: dark')).toBeLessThan(css.indexOf('prefers-contrast: more'));
  });

  it.each(PRESETS)('%s reverts every color key and no type or radius key under contrast', (name) => {
    const css = assemblePreset(name, passes[name]);
    const b = `[data-focsd-brand="${name}"]`;
    const colors = props(ruleBodies(css, `${b},`)[0]).map(([p]) => p);
    const reverts = [...ruleBodies(css, `${b}[data-focsd-theme="contrast"]`), ...ruleBodies(css, `${b}:not([data-focsd-theme])`).slice(1)];

    // The color roles, plus the preset's extras (Prismatic's hue hooks, gradient and chart series).
    expect(colors.length).toBe(passes[name].light.length + Object.keys(PRESET_DATA[name].extras?.light ?? {}).length);
    expect(reverts).toHaveLength(2);
    // A branded element nested under a contrast ancestor is reverted too.
    expect(css).toContain(`,\n  [data-focsd-theme="contrast"] ${b} {`);

    for (const body of reverts) {
      const reverted = props(body);
      expect(reverted.every(([, v]) => v === 'revert-layer')).toBe(true);
      expect(reverted.map(([p]) => p)).toEqual(colors);
      expect(reverted.some(([p]) => /font|radius/.test(p))).toBe(false);
    }
  });

  it('declares fonts with system fallbacks and the R1 radii', () => {
    const css = assemblePreset('mineral', passes.mineral);
    expect(css).toContain('--focsd-font-sans: "Red Hat Text", ui-sans-serif, system-ui, sans-serif;');
    expect(css).not.toContain('--focsd-font-mono');
    expect(assemblePreset('signal', passes.signal)).toContain('--focsd-radius-surface: 12px;');
  });

  it('presets.css holds all three after one order statement', () => {
    const all = assemblePresets(passes);
    expect(all.startsWith(`${ORDER}\n`)).toBe(true);
    expect(all.split(ORDER)).toHaveLength(2);

    for (const name of PRESETS) expect(all).toContain(`[data-focsd-brand="${name}"] {`);
  });
});

describe('presets.json data', () => {
  it('has label, fonts, radii and hex swatches per preset and theme', async () => {
    const data = await presetsData();
    expect(Object.keys(data.presets)).toEqual(PRESETS);
    expect(Object.keys(data.default.swatches)).toEqual(MODES);

    for (const name of PRESETS) {
      const p = data.presets[name];
      expect(p.label).toMatch(/^[A-Z][a-z]+$/);
      expect(p.radius).toEqual({
        control: expect.stringMatching(/px$/),
        surface: expect.stringMatching(/px$/),
        tag: expect.stringMatching(/px$/),
      });

      for (const theme of MODES) {
        expect(Object.keys(p.swatches[theme])).toEqual(['action', 'on-action', 'route', 'ground', 'surface']);

        for (const hex of Object.values(p.swatches[theme])) expect(hex).toMatch(/^#[0-9a-f]{6}$/);
      }
    }

    expect(data.presets.harbor.radius).toEqual({ control: '2px', surface: '4px', tag: '2px' });
    expect(data.default.swatches.light.action).toBe('#141a18');
  });
});

describe('dist (after build)', () => {
  it.each(PRESETS)('dist/presets/%s.css is the assembled file, ≤ 2 KB gzip (3.5 KB for Prismatic)', async (name) => {
    const css = await dist(`presets/${name}.css`);
    expect(css).toBe(assemblePreset(name, passes[name]));
    expect(css).not.toMatch(/url\(|@font-face|@import/);
    // Prismatic also carries eight category colors with tints and their component hooks.
    expect(gzipSync(css).length).toBeLessThanOrEqual(name === 'prismatic' ? 3584 : 2048);
  });

  it('dist/presets.css is ≤ 9 KB gzip and presets.json is written', async () => {
    const all = await dist('presets.css');
    expect(gzipSync(all).length).toBeLessThanOrEqual(9 * 1024);
    expect(JSON.parse(await dist('presets.json'))).toEqual(await presetsData());
  });
});
