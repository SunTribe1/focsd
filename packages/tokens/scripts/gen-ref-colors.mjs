import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { converter } from 'culori';
import { contrast, graded, overlay } from './palette.mjs';

const toOklch = converter('oklch');

/** DTCG 2025.10 color token from a hex string. Rounding (L, C: 4dp; H: 2dp) round-trips every palette hex exactly. */
export function dtcgColor(hex, alpha) {
  const c = toOklch(hex);
  const h = Number.isFinite(c.h) ? Number(c.h.toFixed(2)) : 0;
  const value = { colorSpace: 'oklch', components: [Number(c.l.toFixed(4)), Number(c.c.toFixed(4)), h], hex: hex.toLowerCase() };

  if (alpha !== undefined) value.alpha = alpha;

  return { $value: value };
}

export function buildRefColors() {
  const color = { $type: 'color' };

  for (const [family, hexes] of Object.entries(graded)) {
    color[family] = {};

    for (const hex of hexes) {
      const token = dtcgColor(hex);
      const grade = String(Math.round(token.$value.components[0] * 100));

      if (color[family][grade]) throw new Error(`${family}: ${hex} and another color share grade ${grade}`);
      color[family][grade] = token;
    }
  }

  color.overlay = Object.fromEntries(Object.entries(overlay).map(([name, [hex, alpha]]) => [name, dtcgColor(hex, alpha)]));
  color.contrast = Object.fromEntries(Object.entries(contrast).map(([name, hex]) => [name, dtcgColor(hex)]));

  return { ref: { color } };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = new URL('../src/ref/color.json', import.meta.url);
  await writeFile(out, `${JSON.stringify(buildRefColors(), null, 2)}\n`);
  console.log(`wrote ${fileURLToPath(out)}`);
}
