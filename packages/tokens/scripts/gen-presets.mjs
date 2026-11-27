import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { formatHex, toGamut } from 'culori';
import { dtcgColor } from './gen-ref-colors.mjs';
import { PRESET_DATA } from './preset-palettes.mjs';

const toRgb = toGamut('rgb', 'oklch');
const px = (value) => ({ value, unit: 'px' });

/** [family, L, C?] → a gamut-mapped DTCG color and its ref path (family.grade, grade = round(L × 100)). */
function refColor(data, [family, l, chroma]) {
  const [h, c] = data.families[family];
  const token = dtcgColor(formatHex(toRgb({ mode: 'oklch', l, c: chroma ?? c, h })));

  return { family, grade: String(Math.round(token.$value.components[0] * 100)), token };
}

const refAlias = (name, { family, grade }) => `{ref.color.${name}.${family}.${grade}}`;

/** Group ref colors by family and grade; two different colors on one grade is an authoring error. */
function paletteOf(name, refs) {
  const palette = {};

  for (const { family, grade, token } of refs) {
    palette[family] ??= {};
    const existing = palette[family][grade];

    if (existing && existing.$value.hex !== token.$value.hex) {
      throw new Error(`${name}: ${family}.${grade} is both ${existing.$value.hex} and ${token.$value.hex}`);
    }

    palette[family][grade] = token;
  }

  return palette;
}

const sortedPalette = (palette) =>
  Object.fromEntries(
    Object.entries(palette).map(([family, grades]) => [
      family,
      Object.fromEntries(Object.entries(grades).toSorted(([a], [b]) => Number(a) - Number(b))),
    ]),
  );

/** The four DTCG source files for one preset. */
export function buildPreset(name) {
  const data = PRESET_DATA[name];

  if (!data) throw new Error(`Unknown preset "${name}"`);
  const refs = [];

  const theme = (roles) => {
    const entries = Object.entries(roles).map(([role, spec]) => [role, refColor(data, spec)]);

    refs.push(...entries.map(([, ref]) => ref));

    return {
      sys: { color: { $type: 'color', ...Object.fromEntries(entries.map(([role, ref]) => [role, { $value: refAlias(name, ref) }])) } },
    };
  };

  const light = theme(data.roles.light);
  const dark = theme(data.roles.dark);
  const [control, surface, tag] = data.radius;
  const font = { $type: 'fontFamily', sans: { $value: data.sans } };

  if (data.mono) font.mono = { $value: data.mono };

  const base = {
    sys: {
      font,
      radius: { $type: 'dimension', control: { $value: px(control) }, surface: { $value: px(surface) }, tag: { $value: px(tag) } },
    },
  };

  return { ref: { ref: { color: { $type: 'color', [name]: sortedPalette(paletteOf(name, refs)) } } }, light, dark, base };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const name of Object.keys(PRESET_DATA)) {
    const dir = new URL(`../src/presets/${name}/`, import.meta.url);
    await mkdir(dir, { recursive: true });

    for (const [part, json] of Object.entries(buildPreset(name))) {
      await writeFile(new URL(`${part}.json`, dir), `${JSON.stringify(json, null, 2)}\n`);
    }
  }

  console.log('wrote src/presets/*/{ref,light,dark,base}.json');
}
