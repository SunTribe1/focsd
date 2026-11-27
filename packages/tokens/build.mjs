import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { assembleAll, assembleTheme, loadPasses } from './lib/assemble.mjs';
import { dtsSource, jsSource, resolveAll, systemNames } from './lib/resolved.mjs';
import { PRESET_DATA } from './scripts/preset-palettes.mjs';
import { buildFonts } from './lib/fonts.mjs';
import { figmaFiles } from './lib/figma.mjs';
import { PRESETS, THEMES } from './lib/passes.mjs';
import { assemblePreset, assemblePresets, loadPresetPasses, presetsData } from './lib/presets.mjs';

const dist = new URL('./dist/', import.meta.url);

await rm(dist, { recursive: true, force: true });

await mkdir(new URL('themes/', dist), { recursive: true });

const passes = await loadPasses();

await writeFile(new URL('tokens.css', dist), assembleAll(passes));

for (const theme of THEMES) await writeFile(new URL(`themes/${theme}.css`, dist), assembleTheme(theme, passes));

const rows = await resolveAll();
const system = systemNames(rows);

// Preset hooks (a colorful preset's hue hooks, gradient fill and chart series) are named too: they are
// part of the public vocabulary (components read them with a fallback), though only some presets set them.
const hooks = [...new Set(PRESETS.flatMap((name) => Object.keys(PRESET_DATA[name]?.extras?.light ?? {})))].filter(
  (n) => !system.includes(n),
);

const names = [...system, ...hooks];

await writeFile(new URL('tokens.resolved.json', dist), `${JSON.stringify(rows, null, 2)}\n`);

// Theme presets (wave 16): one file each, all six together, and their preview data.
await mkdir(new URL('presets/', dist), { recursive: true });

const presetPasses = Object.fromEntries(await Promise.all(PRESETS.map(async (n) => [n, await loadPresetPasses(n)])));

for (const name of PRESETS) await writeFile(new URL(`presets/${name}.css`, dist), assemblePreset(name, presetPasses[name]));

await writeFile(new URL('presets.css', dist), assemblePresets(presetPasses));

const presets = await presetsData();

await writeFile(new URL('presets.json', dist), `${JSON.stringify(presets, null, 2)}\n`);

await writeFile(new URL('index.js', dist), jsSource(names, presets));

await writeFile(new URL('index.d.ts', dist), dtsSource(names));

// Figma Variables: one DTCG file per mode, for Figma's native variable import.
await mkdir(new URL('figma/', dist), { recursive: true });

for (const [file, tokens] of Object.entries(figmaFiles(rows)))
  await writeFile(new URL(`figma/${file}`, dist), `${JSON.stringify(tokens, null, 2)}\n`);

await writeFile(new URL('fonts.css', dist), await buildFonts(fileURLToPath(dist)));

await copyFile(new URL('./src/floor.css', import.meta.url), new URL('floor.css', dist));

console.log(
  `✓ built tokens.css, themes/*.css, tokens.resolved.json, index.js, index.d.ts, figma/*.tokens.json, fonts.css, presets/*.css (${system.length} system tokens, ${hooks.length} preset hooks, ${PRESETS.length} presets)`,
);
